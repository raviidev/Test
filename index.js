/**
 * FREE BASE DANUZZ  v0.0.1
 * Plugin-type WhatsApp bot base with QR + Pairing Code login.
 */
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
} = require('@dnuzi/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const express = require('express');
const QRCode = require('qrcode');
const qrTerminal = require('qrcode-terminal');
const { File } = require('megajs');

const config = require('./config');
const events = require('./command');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');

const prefix = config.PREFIX;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const PLUGIN_DIR = path.join(__dirname, 'plugins');

// ─────────────────────────────────────────────────────────────
//  Small helpers
// ─────────────────────────────────────────────────────────────
const log = {
    info: (m) => console.log(`\x1b[36m[INFO]\x1b[0m ${m}`),
    ok:   (m) => console.log(`\x1b[32m[ OK ]\x1b[0m ${m}`),
    warn: (m) => console.log(`\x1b[33m[WARN]\x1b[0m ${m}`),
    err:  (m, e) => console.error(`\x1b[31m[ERR ]\x1b[0m ${m}`, e || ''),
};

const ask = (q) => new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => { rl.close(); resolve(a); });
});

const hasCreds = () => fs.existsSync(path.join(AUTH_DIR, 'creds.json'));

// ─────────────────────────────────────────────────────────────
//  Web server  (health check + QR page)
// ─────────────────────────────────────────────────────────────
let latestQR = null;       // newest QR string from WhatsApp
let isConnected = false;

let activeConn = null;
function startServer() {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '8kb' }));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
    const authorize = (req, res, next) => {
        const expected = config.WEB_PASSWORD;
        if (!expected) return res.status(503).json({ error: 'Dashboard disabled: configure WEB_PASSWORD in config.env.' });
        const supplied = Buffer.from((req.get('authorization') || '').replace(/^Bearer\s+/i, ''));
        const secret = Buffer.from(expected);
        if (supplied.length !== secret.length || !require('crypto').timingSafeEqual(supplied, secret)) {
            return res.status(401).json({ error: 'Invalid dashboard token. Enter the WEB_PASSWORD set by the bot owner.' });
        }
        next();
    };
    app.get('/api/status', authorize, async (req, res) => {
        let qr = null;
        if (latestQR && !isConnected) qr = await QRCode.toDataURL(latestQR, { margin: 2, width: 320 });
        res.json({ connected: isConnected, qr });
    });
    app.post('/api/pair', authorize, async (req, res) => {
        const phone = String(req.body?.phone || '').replace(/\D/g, '');
        if (phone.length < 8 || phone.length > 15) return res.status(400).json({ error: 'Enter a valid phone number with country code (8–15 digits).' });
        if (isConnected || activeConn?.authState?.creds?.registered) return res.status(409).json({ error: 'A WhatsApp device is already linked.' });
        if (!activeConn) return res.status(503).json({ error: 'Bot is starting. Try again in a few seconds.' });
        if (pairRequested) return res.status(429).json({ error: 'A pairing code request is already in progress. Wait and try again.' });
        pairRequested = true;
        try {
            await sleep(1200);
            const raw = await activeConn.requestPairingCode(phone);
            res.json({ code: raw?.match(/.{1,4}/g)?.join('-') || raw });
        } catch (e) {
            log.err('Web pairing code request failed', e);
            res.status(500).json({ error: 'Could not create a pairing code. Refresh the page and try again.' });
        } finally { pairRequested = false; }
    });
    app.get('/qr', authorize, async (req, res) => {
        if (isConnected) return res.send('<h2>Bot is already connected</h2>');
        if (!latestQR) return res.status(202).send('<meta http-equiv="refresh" content="3"><h2>Waiting for QR…</h2>');
        const img = await QRCode.toDataURL(latestQR, { margin: 2, width: 320 });
        res.send(`<meta name="viewport" content="width=device-width,initial-scale=1"><body style="display:grid;place-items:center;height:100vh;margin:0;font-family:sans-serif;background:#0d1117;color:#fff"><div style="text-align:center"><h2>${config.BOT_NAME}</h2><img src="${img}" style="border-radius:12px"><p>WhatsApp → Linked Devices → Link a Device</p></div></body>`);
    });
    app.listen(config.PORT, '0.0.0.0', () => log.info(`Web dashboard on port ${config.PORT} (configure WEB_PASSWORD to unlock)`));
}
// ─────────────────────────────────────────────────────────────
//  Session restore from MEGA (optional)
// ─────────────────────────────────────────────────────────────
function restoreSessionFromMega() {
    return new Promise((resolve) => {
        if (!config.SESSION_ID) return resolve(false);
        try {
            const id = config.SESSION_ID.replace('DNUZ-FREE=', '');
            const file = File.fromURL(`https://mega.nz/file/${id}`);
            file.download((err, data) => {
                if (err) { log.err('MEGA session download failed', err); return resolve(false); }
                fs.mkdirSync(AUTH_DIR, { recursive: true });
                fs.writeFileSync(path.join(AUTH_DIR, 'creds.json'), data);
                log.ok('Session downloaded from MEGA');
                resolve(true);
            });
        } catch (e) {
            log.err('Invalid SESSION_ID', e);
            resolve(false);
        }
    });
}

// ─────────────────────────────────────────────────────────────
//  Plugin loader  (runs once, not on every reconnect)
// ─────────────────────────────────────────────────────────────
let pluginsLoaded = false;
function loadPlugins() {
    if (pluginsLoaded) return;
    pluginsLoaded = true;
    if (!fs.existsSync(PLUGIN_DIR)) fs.mkdirSync(PLUGIN_DIR);
    let count = 0;
    for (const file of fs.readdirSync(PLUGIN_DIR)) {
        if (path.extname(file).toLowerCase() !== '.js') continue;
        try { require(path.join(PLUGIN_DIR, file)); count++; }
        catch (e) { log.err(`Plugin failed: ${file}`, e); }
    }
    log.ok(`Plugins loaded: ${count}`);
}

// ─────────────────────────────────────────────────────────────
//  Message body extractor
// ─────────────────────────────────────────────────────────────
function getBody(message, type) {
    const m = message;
    switch (type) {
        case 'conversation': return m.conversation;
        case 'extendedTextMessage': return m.extendedTextMessage.text;
        case 'imageMessage': return m.imageMessage.caption || '';
        case 'videoMessage': return m.videoMessage.caption || '';
        case 'templateButtonReplyMessage': return m.templateButtonReplyMessage.selectedId;
        case 'buttonsResponseMessage': return m.buttonsResponseMessage.selectedButtonId;
        case 'listResponseMessage': return m.listResponseMessage.singleSelectReply?.selectedRowId || '';
        case 'interactiveResponseMessage':
            try { return JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id; }
            catch { return ''; }
        default: return '';
    }
}

// ─────────────────────────────────────────────────────────────
//  Message handler
// ─────────────────────────────────────────────────────────────
async function handleMessage(conn, mek) {
    if (!mek.message) return;
    mek.message = getContentType(mek.message) === 'ephemeralMessage'
        ? mek.message.ephemeralMessage.message
        : mek.message;

    const from = mek.key.remoteJid;

    // Auto read / react to status
    if (from === 'status@broadcast') {
        if (config.AUTO_READ_STATUS) {
            try {
                await conn.readMessages([mek.key]);
                await conn.sendMessage('status@broadcast',
                    { react: { text: '💙', key: mek.key } },
                    { statusJidList: [mek.key.participant] });
            } catch (e) { log.err('Status react failed', e); }
        }
        return;
    }

    const m = sms(conn, mek);
    const type = getContentType(mek.message);
    const quoted = type === 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo
        ? mek.message.extendedTextMessage.contextInfo.quotedMessage || []
        : [];

    const body = getBody(mek.message, type) || '';
    const isCmd = body.startsWith(prefix);
    const cmdName = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(' ');

    const isGroup = from.endsWith('@g.us');
    const sender = mek.key.fromMe
        ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
        : (mek.key.participant || mek.key.remoteJid);
    const senderNumber = sender.split('@')[0];
    const botNumber = conn.user.id.split(':')[0];
    const botNumber2 = jidNormalizedUser(conn.user.id);
    const pushname = mek.pushName || 'User';
    const isMe = botNumber.includes(senderNumber);
    const isOwner = config.OWNER_NUMBER.includes(senderNumber) || isMe;

    // Work mode filter
    if (!isOwner && config.MODE === 'private') return;
    if (!isOwner && isGroup && config.MODE === 'inbox') return;
    if (!isOwner && !isGroup && config.MODE === 'groups') return;

    const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(() => null) : null;
    const groupName = groupMetadata ? groupMetadata.subject : '';
    const participants = groupMetadata ? groupMetadata.participants : [];
    const groupAdmins = isGroup ? getGroupAdmins(participants) : [];
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

    const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });

    // Helper: extra utilities available on conn for plugins
    conn.sendFileUrl = async (jid, url, caption = '', quotedMsg, options = {}) => {
        const head = await axios.head(url);
        const mime = head.headers['content-type'] || '';
        const buf = await getBuffer(url);
        const opts = { quoted: quotedMsg };
        if (mime.includes('gif')) return conn.sendMessage(jid, { video: buf, caption, gifPlayback: true, ...options }, opts);
        if (mime === 'application/pdf') return conn.sendMessage(jid, { document: buf, mimetype: mime, caption, ...options }, opts);
        if (mime.startsWith('image')) return conn.sendMessage(jid, { image: buf, caption, ...options }, opts);
        if (mime.startsWith('video')) return conn.sendMessage(jid, { video: buf, caption, mimetype: 'video/mp4', ...options }, opts);
        if (mime.startsWith('audio')) return conn.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', ...options }, opts);
        return conn.sendMessage(jid, { document: buf, mimetype: mime || 'application/octet-stream', caption, ...options }, opts);
    };

    // Context passed to every plugin
    const ctx = {
        from, quoted, body, isCmd, command: cmdName, args, q, isGroup, sender, senderNumber,
        botNumber, botNumber2, pushname, isMe, isOwner, groupMetadata, groupName,
        participants, groupAdmins, isBotAdmins, isAdmins, reply,
    };

    // ── Prefix commands ──
    if (isCmd) {
        const found = events.commands.find((c) => c.pattern === cmdName)
            || events.commands.find((c) => c.alias && c.alias.includes(cmdName));
        if (found) {
            if (found.react) conn.sendMessage(from, { react: { text: found.react, key: mek.key } }).catch(() => {});
            try {
                await found.function(conn, mek, m, ctx);
            } catch (e) {
                log.err(`Plugin error (${found.pattern})`, e);
            }
        }
    }

    // ── Event commands  (on: "body" | "text" | "image" | "sticker") ──
    for (const c of events.commands) {
        try {
            if (c.on === 'body' && body) await c.function(conn, mek, m, { ...ctx, command: c });
            else if (c.on === 'text' && q) await c.function(conn, mek, m, { ...ctx, command: c });
            else if ((c.on === 'image' || c.on === 'photo') && type === 'imageMessage') await c.function(conn, mek, m, { ...ctx, command: c });
            else if (c.on === 'sticker' && type === 'stickerMessage') await c.function(conn, mek, m, { ...ctx, command: c });
        } catch (e) {
            log.err('Event plugin error', e);
        }
    }

    if (config.ALWAYS_OFFLINE) conn.sendPresenceUpdate('unavailable').catch(() => {});
}

// ─────────────────────────────────────────────────────────────
//  Connect
// ─────────────────────────────────────────────────────────────
let pairRequested = false;

async function connectToWhatsApp() {
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    // 1) No local creds? try MEGA session first
    if (!hasCreds()) await restoreSessionFromMega();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    log.info(`Using WA v${version.join('.')}  (latest: ${isLatest})`);

    const usePair = config.CONNECT_MODE === 'pair';

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: usePair ? Browsers.ubuntu('Chrome') : Browsers.macOS('Firefox'),
        syncFullHistory: false,
        markOnlineOnConnect: true,
    });

    activeConn = conn;
    conn.ev.on('creds.update', saveCreds);

    // 2) Pairing code login
    if (usePair && !conn.authState.creds.registered && !pairRequested) {
        pairRequested = true;
        let number = (config.PAIR_NUMBER || '').replace(/[^0-9]/g, '');
        if (number) {
            await sleep(3000);
            try {
                const code = await conn.requestPairingCode(number);
                const pretty = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n\x1b[32m🔑 PAIRING CODE:\x1b[0m \x1b[1m${pretty}\x1b[0m`);
                console.log('→ WhatsApp → Linked Devices → Link with phone number instead\n');
                pairRequested = false;
            } catch (e) {
                pairRequested = false;
                log.err('Failed to get pairing code', e);
            }
        } else {
            pairRequested = false;
            log.info('Open the web dashboard to request a pairing code.');
        }
    }

    // 3) Connection events
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // QR login
        if (qr && !usePair) {
            latestQR = qr;
            log.info('Scan this QR (or open /qr in your browser):');
            qrTerminal.generate(qr, { small: true });
        }

        if (connection === 'close') {
            isConnected = false;
            const code = lastDisconnect?.error instanceof Boom
                ? lastDisconnect.error.output.statusCode
                : undefined;

            if (code === DisconnectReason.loggedOut) {
                log.warn('Logged out. Deleting session — restart to log in again.');
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                pairRequested = false;
                return;
            }
            log.warn(`Connection closed (code ${code ?? 'unknown'}). Reconnecting...`);
            setTimeout(connectToWhatsApp, 2000);
        }

        if (connection === 'open') {
            isConnected = true;
            latestQR = null;
            pairRequested = false;
            log.ok(`Connected as ${jidNormalizedUser(conn.user.id)}`);
            loadPlugins();

            const targetJid = config.OWNER_NUMBER[0] && !config.OWNER_NUMBER[0].includes('X')
                ? config.OWNER_NUMBER[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
                : jidNormalizedUser(conn.user.id);

            const connectTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
            const connectMsg = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  🤖 *${config.BOT_NAME}*  ┃
╰━━━━━━━━━━━━━━━━━━━━━╯

✅ *Bot Connected Successfully!*

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ 👑 *Owner  :*  \`${config.OWNER_NAME}\`
┃ 📌 *Prefix :*  \`${prefix}\`
┃ 🛡️ *Mode   :*  \`${config.MODE.toUpperCase()}\`
┃ 🔐 *Login  :*  \`${config.CONNECT_MODE.toUpperCase()}\`
┃ 🧩 *Plugins:*  \`${events.commands.length}\`
┃ ⏰ *Time   :*  \`${connectTime}\`
┗━━━━━━━━━━━━━━━━━━━━━┛

💡 _Type *${prefix}alive* or *${prefix}ping* to test!_

> ${config.BOT_FOOTER}`;

            conn.sendMessage(targetJid, { text: connectMsg }).catch(() => {});
        }
    });

    // 4) Messages
    conn.ev.on('messages.upsert', async ({ messages }) => {
        try { await handleMessage(conn, messages[0]); }
        catch (e) { log.err('Message handler error', e); }
    });

    return conn;
}

// ─────────────────────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────────────────────
process.on('uncaughtException', (e) => log.err('Uncaught exception', e));
process.on('unhandledRejection', (e) => log.err('Unhandled rejection', e));

console.log(`\n=== ${config.BOT_NAME} v0.0.1 | login: ${config.CONNECT_MODE.toUpperCase()} ===\n`);
startServer();
setTimeout(connectToWhatsApp, 2000);
