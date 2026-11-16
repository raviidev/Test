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

const API_BASE = 'https://infinity-api.sandaliamaya2012.workers.dev';
const TIMEOUT = 60000;
const MAX_FILE_MB = 60;
const TTL = 5 * 60 * 1000;

const pending = new Map();

function setPending(chatId, userId, data) {
    const k = `${chatId}:${userId}`;
    pending.set(k, { ...data, ts: Date.now() });
    setTimeout(() => {
        const s = pending.get(k);
        if (s && Date.now() - s.ts >= TTL) pending.delete(k);
    }, TTL + 1000).unref?.();
}
function getPending(chatId, userId) {
    const k = `${chatId}:${userId}`;
    const s = pending.get(k);
    if (!s) return null;
    if (Date.now() - s.ts > TTL) { pending.delete(k); return null; }
    return s;
}
function delPending(chatId, userId) { pending.delete(`${chatId}:${userId}`); }

async function fetchT(url, opts = {}, ms = TIMEOUT) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
}

async function getJSON(url, label) {
    const res = await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const data = await res.json();
    if (data?.status === false || data?.success === false) throw new Error(`${label}: ${data?.message || data?.error || 'API failure'}`);
    return data;
}

function findArrayByKeys(obj, keys, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    for (const k of keys) {
        if (Array.isArray(obj[k]) && obj[k].length && typeof obj[k][0] === 'object') return obj[k];
    }
    for (const k of Object.keys(obj)) {
        const r = findArrayByKeys(obj[k], keys, depth + 1);
        if (r) return r;
    }
    return null;
}

function findAnyObjectArray(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    if (Array.isArray(obj) && obj.length && typeof obj[0] === 'object') return obj;
    for (const k of Object.keys(obj)) {
        const r = findAnyObjectArray(obj[k], depth + 1);
        if (r) return r;
    }
    return null;
}

function findString(obj, keys, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    for (const k of keys) if (typeof obj[k] === 'string' && obj[k].trim()) return obj[k];
    for (const k of Object.keys(obj)) {
        const r = findString(obj[k], keys, depth + 1);
        if (r) return r;
    }
    return null;
}

function findUrl(obj, depth = 0) {
    if (!obj || depth > 6) return null;
    if (typeof obj === 'string') return /^https?:\/\//i.test(obj) ? obj : null;
    if (typeof obj !== 'object') return null;
    const keys = ['downloadUrl', 'download_url', 'dlink', 'dl', 'link', 'url', 'file'];
    for (const k of keys) if (typeof obj[k] === 'string' && /^https?:\/\//i.test(obj[k])) return obj[k];
    for (const k of Object.keys(obj)) {
        const r = findUrl(obj[k], depth + 1);
        if (r) return r;
    }
    return null;
}

function extractItems(obj) {
    // Returns [{ label, url }] from any common anime-api shape
    const keys = ['episodes', 'episodeList', 'episode_list', 'downloads', 'qualities', 'links', 'servers', 'items'];
    let arr = findArrayByKeys(obj, keys);
    if (!arr) arr = findAnyObjectArray(obj);
    if (!arr) return [];
    return arr.map((x) => {
        if (typeof x === 'string') return { label: x, url: /^https?:/i.test(x) ? x : null };
        const label = x.title || x.name || x.quality || x.label || x.episode || x.format || 'item';
        const url = x.url || x.link || x.href || x.downloadUrl || x.dlink || x.download || x.file || null;
        return { label: String(label), url };
    }).filter((x) => x.url);
}

async function searchAnime(q) {
    const data = await getJSON(`${API_BASE}/api/animeheaven/search?q=${encodeURIComponent(q)}`, 'search');
    const arr = findArrayByKeys(data, ['results', 'data', 'anime', 'items']) || findAnyObjectArray(data);
    if (!arr) return [];
    return arr.slice(0, 10).map((x) => ({
        title: x.title || x.name || 'Unknown',
        url: x.url || x.link || x.href || null,
        year: x.year || null
    })).filter((x) => x.url);
}

async function fetchBuf(url, label) {
    const res = await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 180000);
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error(`${label}: empty`);
    return buf;
}

async function resolveDownload(item) {
    // Direct file?
    if (/\.(mp4|mkv|avi|webm)(\?|$)/i.test(item.url)) return item.url;

    // Try download endpoint
    const dlApi = `${API_BASE}/api/animeheaven/download?url=${encodeURIComponent(item.url)}&quality=720`;
    try {
        const data = await getJSON(dlApi, 'download');
        const u = findUrl(data);
        if (u) return u;
    } catch (e) {}

    // Try movie endpoint
    try {
        const movie = await getJSON(`${API_BASE}/api/animeheaven/movie?url=${encodeURIComponent(item.url)}`, 'movie');
        const u = findUrl(movie);
        if (u) return u;
    } catch (e) {}

    // Try info
    try {
        const info = await getJSON(`${API_BASE}/api/animeheaven/info?url=${encodeURIComponent(item.url)}`, 'info');
        const u = findUrl(info);
        if (u) return u;
    } catch (e) {}

    throw new Error('No download link resolved');
}

module.exports = {
    name: 'anime',
    description: 'Search & download anime (AnimeHeaven)',
    category: 'downloaders',
    alias: ['animeheaven', 'anidl'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        const query = args.join(' ').trim();

        try { await sock.sendMessage(chatId, { react: { text: '⛩️', key: msg.key } }); } catch (e) {}

        if (!query) {
            return sock.sendMessage(chatId, {
                text: `┌─ム ${getTitle('anime')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔍 ${prefix}ᴀɴɪᴍᴇ <ɴᴀᴍᴇ>\n│ 📌 ${prefix}ᴀɴɪᴍᴇ ɴᴀʀᴜᴛᴏ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { text: `🔍 ꜱᴇᴀʀᴄʜɪɴɢ "${query}"...\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });

            const results = await searchAnime(query);
            if (!results.length) {
                return sock.sendMessage(chatId, { text: '❌ No anime found.', contextInfo: forwardContext() }, { quoted: msg });
            }

            const lines = results.map((r, i) => {
                const y = r.year ? ` (${r.year})` : '';
                return `│ *${i + 1}.* ${r.title}${y}`;
            }).join('\n');

            const sent = await sock.sendMessage(chatId, {
                text: `╭─〔 *ꜱᴇᴀʀᴄʜ ʀᴇꜱᴜʟᴛꜱ* 〕─┈⊷\n${lines}\n╰─────────────┈⊷\n\n📩 *Reply* ɴᴜᴍʙᴇʀ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });

            setPending(chatId, userId, { stage: 'anime', results, botMsgId: sent?.key?.id || null });
            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
        } catch (err) {
            console.error('anime error:', err.message);
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            await sock.sendMessage(chatId, { text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
        }
    },

    async handleReply(sock, msg, body, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const m = String(body).trim().match(/^(\d+)$/);
        if (!m) return false;

        const session = getPending(chatId, userId);
        if (!session) return false;

        const rctx = msg.message?.extendedTextMessage?.contextInfo;
        const repliedId = rctx?.stanzaId;
        if (session.botMsgId && repliedId !== session.botMsgId) return false;

        const num = Number(m[1]) - 1;

        // Stage 1: pick anime
        if (session.stage === 'anime') {
            const pick = session.results[num];
            if (!pick) {
                await sock.sendMessage(chatId, { text: `❌ Invalid. Reply 1-${session.results.length}.`, contextInfo: forwardContext() }, { quoted: msg });
                return true;
            }
            delPending(chatId, userId);

            try { await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } }); } catch (e) {}
            try {
                await sock.sendMessage(chatId, { text: `⏳ ꜰᴇᴛᴄʜɪɴɢ ʟɪɴᴋꜱ...\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });

                let items = [];
                let title = pick.title;

                try {
                    const info = await getJSON(`${API_BASE}/api/animeheaven/info?url=${encodeURIComponent(pick.url)}`, 'info');
                    title = findString(info, ['title', 'name']) || title;
                    items = extractItems(info);
                } catch (e) { console.error('anime info error:', e.message); }

                if (!items.length) {
                    try {
                        const movie = await getJSON(`${API_BASE}/api/animeheaven/movie?url=${encodeURIComponent(pick.url)}`, 'movie');
                        items = extractItems(movie);
                    } catch (e) { console.error('anime movie error:', e.message); }
                }

                if (!items.length) {
                    await sock.sendMessage(chatId, { text: '❌ No download links found.', contextInfo: forwardContext() }, { quoted: msg });
                    return true;
                }

                const lines = items.map((it, i) => `│ *${i + 1}.* ${it.label}`).join('\n');
                const sent = await sock.sendMessage(chatId, {
                    text: `🎬 *${title}*\n\n╭─〔 *ᴅᴏᴡɴʟᴏᴀᴅ ᴏᴘᴛɪᴏɴꜱ* 〕─┈⊷\n${lines}\n╰─────────────┈⊷\n\n📩 *Reply* ɴᴜᴍʙᴇʀ.\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });

                setPending(chatId, userId, { stage: 'download', items, title, botMsgId: sent?.key?.id || null });
            } catch (err) {
                await sock.sendMessage(chatId, { text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
            }
            return true;
        }

        // Stage 2: pick download item
        if (session.stage === 'download') {
            const pick = session.items[num];
            if (!pick) {
                await sock.sendMessage(chatId, { text: `❌ Invalid. Reply 1-${session.items.length}.`, contextInfo: forwardContext() }, { quoted: msg });
                return true;
            }
            delPending(chatId, userId);

            try { await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } }); } catch (e) {}
            try {
                await sock.sendMessage(chatId, { text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ${pick.label}...\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });

                const dlUrl = await resolveDownload(pick);
                const buf = await fetchBuf(dlUrl, 'anime file');

                const safeName = (session.title || 'anime').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'anime';
                const sizeMB = buf.length / (1024 * 1024);
                const caption = `⛩️ *${session.title}*\n📦 ${pick.label}\n\n> ${config.BOT_FOOTER}`;

                if (sizeMB > MAX_FILE_MB) {
                    await sock.sendMessage(chatId, { document: buf, mimetype: 'video/mp4', fileName: `${safeName}.mp4`, caption, contextInfo: forwardContext() }, { quoted: msg });
                } else {
                    try {
                        await sock.sendMessage(chatId, { video: buf, mimetype: 'video/mp4', fileName: `${safeName}.mp4`, caption, contextInfo: forwardContext() }, { quoted: msg });
                    } catch (e) {
                        await sock.sendMessage(chatId, { document: buf, mimetype: 'video/mp4', fileName: `${safeName}.mp4`, caption, contextInfo: forwardContext() }, { quoted: msg });
                    }
                }
                try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
            } catch (err) {
                console.error('anime download error:', err.message);
                try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
                await sock.sendMessage(chatId, { text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
            }
            return true;
        }

        return false;
    }
};