const config = require('../config');

const SC = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ' };
const sc = (str) => String(str).toLowerCase().replace(/[a-z]/g, (ch) => SC[ch] || ch);
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
const TTL = 10 * 60 * 1000;

const PROVIDERS = [
    { id: 'sinhalasub', name: 'SinhalaSub', color: '🇱🇰' },
    { id: 'cinesubz',   name: 'CineSubz',   color: '🎬' },
    { id: 'lankasubz',  name: 'LankaSubz',  color: '🎥' },
    { id: 'baiscope',   name: 'Baiscope',   color: '📺' }
];

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

async function fetchBuf(url, label) {
    const res = await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 180000);
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error(`${label}: empty file`);
    return buf;
}

/* Recursive Helpers */
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
    const keys = ['downloadUrl', 'download_url', 'dlink', 'dl', 'link', 'url', 'file', 'direct_link'];
    for (const k of keys) if (typeof obj[k] === 'string' && /^https?:\/\//i.test(obj[k])) return obj[k];
    for (const k of Object.keys(obj)) {
        const r = findUrl(obj[k], depth + 1);
        if (r) return r;
    }
    return null;
}

function extractSearchResults(obj, providerId) {
    const keys = ['results', 'data', 'items', 'movies', 'shows', 'posts'];
    let arr = findArrayByKeys(obj, keys) || findAnyObjectArray(obj);
    if (!arr) return [];
    
    return arr.map(x => {
        const title = x.title || x.name || x.postTitle || 'Unknown';
        const url = x.url || x.link || x.href || x.postUrl || null;
        // Thumbnail eka hoyanawa
        const image = x.image || x.thumbnail || x.poster || x.cover || x.thumb || null;
        return { title: String(title), url, image, provider: providerId };
    }).filter(x => x.url && x.title !== 'Unknown');
}

function extractDownloadLinks(obj) {
    const keys = ['downloads', 'qualities', 'links', 'servers', 'episodes', 'items'];
    let arr = findArrayByKeys(obj, keys);
    if (!arr) {
        const u = findUrl(obj);
        if (u) return [{ label: 'Default', url: u }];
        return [];
    }
    
    return arr.map(x => {
        if (typeof x === 'string') return { label: 'Download', url: x };
        const label = x.quality || x.label || x.title || x.episode || x.name || x.format || 'Download';
        const url = x.url || x.link || x.href || x.downloadUrl || x.dlink || x.file || x.direct_link || null;
        return { label: String(label), url };
    }).filter(x => x.url);
}

function getReplyStanzaId(msg) {
    const m = msg.message || {};
    return (
        (m.extendedTextMessage?.contextInfo?.stanzaId) ||
        (m.ephemeralMessage?.message?.extendedTextMessage?.contextInfo?.stanzaId) ||
        (m.viewOnceMessage?.message?.extendedTextMessage?.contextInfo?.stanzaId) ||
        null
    );
}

module.exports = {
    name: 'movie',
    description: 'Search and download Sinhala sub movies/TV shows',
    category: 'downloaders',
    alias: ['mv', 'sinhalasub', 'cinesubz', 'lankasubz', 'baiscope', 'film'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        const query = args.join(' ').trim();

        try { await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } }); } catch (e) {}

        if (!query) {
            return sock.sendMessage(chatId, {
                text: `┌─ム ${getTitle('movie')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🎬 ${prefix}ᴍᴏᴠɪᴇ <ɴᴀᴍᴇ>\n│ 📌 ${prefix}ᴍᴏᴠɪᴇ ᴀᴠᴀᴛᴀʀ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, {
            text: `🔍 ꜱᴇᴀʀᴄʜɪɴɢ "${query}"...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            let allResults = [];
            
            for (const p of PROVIDERS) {
                try {
                    const data = await getJSON(`${API_BASE}/api/${p.id}/search?q=${encodeURIComponent(query)}`, `${p.id}/search`);
                    const res = extractSearchResults(data, p.id);
                    allResults.push(...res);
                } catch (e) {
                    // API error eka console eke pennanawa, but bot ekata penenne na
                    console.log(`Search skipped on ${p.name}:`, e.message);
                }
            }

            if (!allResults.length) {
                return sock.sendMessage(chatId, { text: '❌ No results found.', contextInfo: forwardContext() }, { quoted: msg });
            }

            // Siyalla pennanawa (slicing ain karala)
            const lines = allResults.map((r, i) => {
                const pInfo = PROVIDERS.find(x => x.id === r.provider);
                return `│ *${i + 1}.* [${pInfo.color} ${pInfo.name}] ${r.title}`;
            }).join('\n');

            const sent = await sock.sendMessage(chatId, {
                text: `╭─〔 *ꜱᴇᴀʀᴄʜ ʀᴇꜱᴜʟᴛꜱ* 〕─┈⊷\n${lines}\n╰─────────────┈⊷\n\n📩 *Reply* ɴᴜᴍʙᴇʀ ᴛᴏ ꜱᴇʟᴇᴄᴛ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });

            setPending(chatId, userId, {
                stage: 'search',
                results: allResults,
                botMsgId: sent?.key?.id || null
            });

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
        } catch (err) {
            console.error('Movie Search Error:', err.message);
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

        const repliedId = getReplyStanzaId(msg);
        if (session.botMsgId && repliedId !== session.botMsgId) return false;

        const num = Number(m[1]) - 1;

        // Stage 1: Select Movie/Show
        if (session.stage === 'search') {
            const pick = session.results[num];
            if (!pick) {
                await sock.sendMessage(chatId, { text: `❌ Invalid. Reply 1-${session.results.length}.`, contextInfo: forwardContext() }, { quoted: msg });
                return true;
            }
            delPending(chatId, userId);

            try { await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } }); } catch (e) {}
            try {
                await sock.sendMessage(chatId, { text: `⏳ ꜰᴇᴛᴄʜɪɴɢ ʟɪɴᴋꜱ ꜰʀᴏᴍ ${pick.provider.toUpperCase()}...\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });

                let links = [];
                let finalTitle = pick.title;
                let imageUrl = pick.image; // Search eken ena image eka

                try {
                    const info = await getJSON(`${API_BASE}/api/${pick.provider}/info?url=${encodeURIComponent(pick.url)}`, 'info');
                    finalTitle = findString(info, ['title', 'name']) || finalTitle;
                    
                    // Info eken thumbnail ekak nam eka gannawa
                    const infoImg = findString(info, ['image', 'thumbnail', 'poster', 'cover']);
                    if (infoImg) imageUrl = infoImg;

                    links = extractDownloadLinks(info);
                } catch (e) { console.error('Info failed:', e.message); }

                if (!links.length) {
                    for (const ep of ['movie', 'tvshow', 'tvseries', 'episode']) {
                        try {
                            const data = await getJSON(`${API_BASE}/api/${pick.provider}/${ep}?url=${encodeURIComponent(pick.url)}`, ep);
                            const l = extractDownloadLinks(data);
                            if (l.length) { links = l; break; }
                        } catch (e) {}
                    }
                }

                if (!links.length) {
                    await sock.sendMessage(chatId, { text: '❌ No download links found.', contextInfo: forwardContext() }, { quoted: msg });
                    return true;
                }

                const lines = links.map((l, i) => `│ *${i + 1}.* ${l.label}`).join('\n');
                const caption = `🎬 *${finalTitle}*\n\n╭─〔 *ᴅᴏᴡɴʟᴏᴀᴅ ᴏᴘᴛɪᴏɴꜱ* 〕─┈⊷\n${lines}\n╰─────────────┈⊷\n\n📩 *Reply* ɴᴜᴍʙᴇʀ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ.\n\n> ${config.BOT_FOOTER}`;

                // Thumbnail eka thiyenawa nam image ekak widiyata yawanawa, nattan text
                let sent;
                if (imageUrl) {
                    try {
                        const imgBuf = await fetchBuf(imageUrl, 'thumbnail');
                        sent = await sock.sendMessage(chatId, { image: imgBuf, caption, contextInfo: forwardContext() }, { quoted: msg });
                    } catch (e) {
                        console.log('Thumbnail fetch failed, sending text:', e.message);
                        sent = await sock.sendMessage(chatId, { text: caption, contextInfo: forwardContext() }, { quoted: msg });
                    }
                } else {
                    sent = await sock.sendMessage(chatId, { text: caption, contextInfo: forwardContext() }, { quoted: msg });
                }

                setPending(chatId, userId, {
                    stage: 'download',
                    items: links,
                    title: finalTitle,
                    provider: pick.provider,
                    pageUrl: pick.url,
                    botMsgId: sent?.key?.id || null
                });
            } catch (err) {
                console.error('Movie Info Error:', err.message);
                await sock.sendMessage(chatId, { text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
            }
            return true;
        }

        // Stage 2: Download
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

                let finalDlUrl = pick.url;
                let resolved = false;

                // Direct video file ekak nemei nam API eken resolve karanawa
                if (!/\.(mp4|mkv|avi|webm)/i.test(finalDlUrl)) {
                    // Quality eka wena wena widiyata try karanawa (1080p -> 1080 -> fhd)
                    const qVars = [pick.label, pick.label.replace(/[^0-9]/g, ''), pick.label.toLowerCase()];
                    
                    // 1. Try with pick.url
                    for (const q of qVars) {
                        try {
                            const dlData = await getJSON(`${API_BASE}/api/${session.provider}/download?url=${encodeURIComponent(finalDlUrl)}&quality=${encodeURIComponent(q)}`, 'download');
                            const realUrl = findUrl(dlData);
                            if (realUrl) { finalDlUrl = realUrl; resolved = true; break; }
                        } catch (e) {
                            console.log(`Download resolve (pick.url, q=${q}) failed:`, e.message);
                        }
                    }

                    // 2. Fail nam try with main pageUrl
                    if (!resolved) {
                        for (const q of qVars) {
                            try {
                                const dlData2 = await getJSON(`${API_BASE}/api/${session.provider}/download?url=${encodeURIComponent(session.pageUrl)}&quality=${encodeURIComponent(q)}`, 'download');
                                const realUrl2 = findUrl(dlData2);
                                if (realUrl2) { finalDlUrl = realUrl2; resolved = true; break; }
                            } catch (e) {
                                console.log(`Download resolve (pageUrl, q=${q}) failed:`, e.message);
                            }
                        }
                    }

                    if (!resolved) throw new Error('API could not resolve a direct download link. The video might be deleted or API is down.');
                }

                const buf = await fetchBuf(finalDlUrl, 'movie file');

                const safeName = (session.title || 'movie').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'movie';
                const caption = `🎬 *${session.title}*\n📦 ${pick.label}\n\n> ${config.BOT_FOOTER}`;
                const sizeMB = buf.length / (1024 * 1024);

                if (sizeMB > MAX_FILE_MB) {
                    await sock.sendMessage(chatId, {
                        document: buf,
                        mimetype: 'video/mp4',
                        fileName: `${safeName}.mp4`,
                        caption,
                        contextInfo: forwardContext()
                    }, { quoted: msg });
                } else {
                    try {
                        await sock.sendMessage(chatId, {
                            video: buf,
                            mimetype: 'video/mp4',
                            fileName: `${safeName}.mp4`,
                            caption,
                            contextInfo: forwardContext()
                        }, { quoted: msg });
                    } catch (e) {
                        await sock.sendMessage(chatId, {
                            document: buf,
                            mimetype: 'video/mp4',
                            fileName: `${safeName}.mp4`,
                            caption,
                            contextInfo: forwardContext()
                        }, { quoted: msg });
                    }
                }
                try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
            } catch (err) {
                console.error('Movie Download Error:', err.message);
                try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
                await sock.sendMessage(chatId, { text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
            }
            return true;
        }

        return false;
    }
};