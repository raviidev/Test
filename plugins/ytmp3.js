const yts = require('yt-search');
const config = require('../config');

const SC = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ' };
const sc = (str) => String(str).toLowerCase().replace(/[a-z]/g, (ch) => SC[ch]);
const getTitle = (cmd) => `${sc(config.BOT_NAME)} </> ${sc(cmd)}`;

function forwardContext() {
    const contextInfo = { forwardingScore: 999, isForwarded: true };
    if (config.NEWSLETTER_JID) {
        contextInfo.forwardedNewsletterMessageInfo = {
            newsletterJid: config.NEWSLETTER_JID,
            newsletterName: config.BOT_NAME,
            serverMessageId: 1
        };
    }
    return contextInfo;
}

/* API settings (config eke onema na, key one na) */
const YT_API_BASE = 'https://infinity-api.sandaliamaya2012.workers.dev';
const OLD_API = 'https://api-abztech.zone.id/download/ytmp3'; // fallback
const TIMEOUT = 60000;

async function fetchT(url, opts = {}, ms = TIMEOUT) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
        clearTimeout(t);
    }
}

/* Response eke ona thanaka thiyena download link eka hoyanawa */
function findUrl(obj, depth = 0) {
    if (!obj || depth > 5) return null;
    if (typeof obj === 'string') return /^https?:\/\//i.test(obj) ? obj : null;
    if (typeof obj !== 'object') return null;

    const keys = ['downloadUrl', 'download_url', 'dlink', 'dl', 'link', 'url', 'audio', 'file'];
    for (const k of keys) {
        if (typeof obj[k] === 'string' && /^https?:\/\//i.test(obj[k])) return obj[k];
    }
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === 'object') {
            const found = findUrl(v, depth + 1);
            if (found) return found;
        }
    }
    return null;
}

function findTitle(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 5) return null;
    if (typeof obj.title === 'string' && obj.title.trim()) return obj.title;
    for (const k of Object.keys(obj)) {
        const t = findTitle(obj[k], depth + 1);
        if (t) return t;
    }
    return null;
}

/* Endpoint ekak call karala { buffer, title } or throw */
async function callEndpoint(endpoint, label) {
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    const res = await fetchT(endpoint, { headers });
    const ctype = (res.headers.get('content-type') || '').toLowerCase();

    // API eka direct audio file ekak denawa nam
    if (res.ok && (ctype.startsWith('audio/') || ctype.includes('octet-stream'))) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length) throw new Error(`${label}: empty audio`);
        return { buffer: buf, title: null };
    }

    let data;
    try { data = await res.json(); } catch { throw new Error(`${label}: invalid response (HTTP ${res.status})`); }

    if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${data?.message || data?.error || ''}`.trim());
    if (data?.status === false || data?.success === false) throw new Error(`${label}: ${data?.message || data?.error || 'API returned failure'}`);

    const dlUrl = findUrl(data.download ?? data.result ?? data.data ?? data);
    if (!dlUrl) throw new Error(`${label}: no download url in response`);

    const audioRes = await fetchT(dlUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 120000);
    if (!audioRes.ok) throw new Error(`${label}: audio download HTTP ${audioRes.status}`);

    const buf = Buffer.from(await audioRes.arrayBuffer());
    if (!buf.length) throw new Error(`${label}: downloaded audio is empty`);
    return { buffer: buf, title: findTitle(data) };
}

/* Providers: palaweni eka fail unoth ilaga ekata yanawa */
function buildProviders(videoUrl) {
    const u = encodeURIComponent(videoUrl);
    const list = [];

    {
        // 1) /api/youtube/download
        for (const q of ['128', '192', 'mp3']) {
            list.push(() => callEndpoint(`${YT_API_BASE}/api/youtube/download?url=${u}&quality=${q}`, `youtube/download(q=${q})`));
        }
        list.push(() => callEndpoint(`${YT_API_BASE}/api/youtube/download?url=${u}`, 'youtube/download'));
        // 2) /api/song/audio  &  /api/song/download
        list.push(() => callEndpoint(`${YT_API_BASE}/api/song/audio?url=${u}`, 'song/audio'));
        list.push(() => callEndpoint(`${YT_API_BASE}/api/song/download?url=${u}&quality=128`, 'song/download'));
    }

    // Old API fallback
    list.push(() => callEndpoint(`${OLD_API}?url=${u}`, 'fallback-api'));

    return list;
}

/* Okkoma fail unoth debug endpoint eka console ekata print karanawa */
async function logDebug(videoUrl) {
    try {
        const r = await fetchT(`${YT_API_BASE}/api/youtube/debug?url=${encodeURIComponent(videoUrl)}`, {}, 15000);
        console.log('YTMP3 debug:', (await r.text()).slice(0, 1500));
    } catch (e) {
        console.log('YTMP3 debug failed:', e.message);
    }
}

module.exports = {
    name: 'ytmp3',
    description: 'Download YouTube audio (link or search)',
    category: 'downloaders',
    alias: ['ytdl', 'ytaudio', 'ytdlv3'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        const input = args.join(' ').trim();

        try { await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } }); } catch (e) {}

        if (!input) {
            return sock.sendMessage(chatId, {
                text: `┌─ム ${getTitle('ytmp3')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ʏᴛᴍᴘ3 <ꜱᴇᴀʀᴄʜ/ʟɪɴᴋ>\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            let finalUrl = input;
            let searchInfo = null;

            if (!/youtube\.com|youtu\.be/i.test(input)) {
                const results = await yts(input);
                if (!results?.videos?.length) {
                    return sock.sendMessage(chatId, { text: '❌ No results found on YouTube.', contextInfo: forwardContext() }, { quoted: msg });
                }
                searchInfo = results.videos[0];
                finalUrl = searchInfo.url;
            }

            await sock.sendMessage(chatId, { text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴀᴜᴅɪᴏ...\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });

            // Providers ekin ekin try karanawa
            let result = null;
            const errors = [];
            for (const run of buildProviders(finalUrl)) {
                try {
                    result = await run();
                    if (result?.buffer?.length) break;
                } catch (e) {
                    errors.push(e.message);
                    console.error('YTMP3 provider failed:', e.message);
                }
            }

            if (!result?.buffer?.length) {
                await logDebug(finalUrl);
                throw new Error(errors.length ? errors[errors.length - 1] : 'All APIs failed');
            }

            const title = result.title || searchInfo?.title || 'YouTube Audio';
            const safeName = title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 100) || 'audio';

            try {
                await sock.sendMessage(chatId, {
                    audio: result.buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${safeName}.mp3`,
                    ptt: false,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            } catch (sendErr) {
                // Audio widiyata yawanna bari unoth document widiyata yawanawa
                console.error('YTMP3 audio send failed, sending as document:', sendErr.message);
                await sock.sendMessage(chatId, {
                    document: result.buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${safeName}.mp3`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}

        } catch (err) {
            console.error('YTMP3 error:', err.message);
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            await sock.sendMessage(chatId, { text: `❌ Failed to process request.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
        }
    }
};