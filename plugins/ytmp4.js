const yts = require('yt-search');
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
const MAX_VIDEO_MB = 60;
const TTL = 5 * 60 * 1000; // 5 mins

const QUALITIES = [
    { key: '1080', label: '🎬 1080p FHD' },
    { key: '720',  label: '🎬 720p HD' },
    { key: '480',  label: '📱 480p' },
    { key: '360',  label: '📱 360p' }
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

function findUrl(obj, depth = 0) {
    if (!obj || depth > 6) return null;
    if (typeof obj === 'string') return /^https?:\/\//i.test(obj) ? obj : null;
    if (typeof obj !== 'object') return null;
    
    // First look for keys that contain a URL
    const keys = ['downloadUrl', 'download_url', 'dlink', 'dl', 'link', 'url', 'video', 'file', 'direct_link'];
    for (const k of keys) {
        if (typeof obj[k] === 'string' && /^https?:\/\//i.test(obj[k])) return obj[k];
    }
    
    // Recursive search
    for (const k of Object.keys(obj)) {
        const r = findUrl(obj[k], depth + 1);
        if (r) return r;
    }
    return null;
}

function findTitle(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    const t = obj.title || obj.name;
    if (typeof t === 'string' && t.trim()) return t;
    for (const k of Object.keys(obj)) {
        const r = findTitle(obj[k], depth + 1);
        if (r) return r;
    }
    return null;
}

async function fetchBuf(url, label) {
    const res = await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 180000);
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error(`${label}: empty file`);
    return buf;
}

async function getJSON(url, label) {
    const res = await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const data = await res.json();
    if (data?.status === false || data?.success === false) throw new Error(`${label}: ${data?.message || data?.error || 'failure'}`);
    return data;
}

function qualityFallbacks(q) {
    const map = {
        '1080': ['1080', '720', 'hd'],
        '720':  ['720', 'hd', '1080'],
        '480':  ['480', 'sd', '360'],
        '360':  ['360', 'sd', '480'],
        'hd':   ['hd', '720', '1080'],
        'sd':   ['sd', '480', '360']
    };
    return map[q] || [q, '720', 'hd'];
}

async function tryDownloadQuality(videoUrl, quality) {
    const u = encodeURIComponent(videoUrl);
    const qChain = qualityFallbacks(quality);

    for (const q of qChain) {
        const attempts = [
            [`${API_BASE}/api/youtube/download?url=${u}&quality=${q}`, `download(${q})`],
            [`${API_BASE}/api/youtube/video?url=${u}&quality=${q}`, `video(${q})`]
        ];
        let urls = [], title = null;
        for (const [endpoint, label] of attempts) {
            try {
                const data = await getJSON(endpoint, label);
                if (!title) title = findTitle(data);
                const dlUrl = findUrl(data);
                if (dlUrl) { urls.push(dlUrl); break; }
            } catch (e) { console.error(`YT ${label} failed:`, e.message); }
        }
        
        if (urls.length) {
            for (const dlUrl of urls) {
                try {
                    const buf = await fetchBuf(dlUrl, 'video');
                    if (buf.length > 1024) return { buffer: buf, title };
                } catch (e) { console.error('YT download failed:', e.message); }
            }
        }
    }
    throw new Error('All YouTube APIs failed to resolve video.');
}

async function sendVideoFile(sock, chatId, msg, buffer, title, qualityLabel) {
    const safeName = (title || 'video').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'video';
    const qLine = qualityLabel ? `🎞️ *ǫᴜᴀʟɪᴛʏ:* ${qualityLabel}\n` : '';
    
    const lines = QUALITIES.map((q, i) => `│ *${i + 1}.* ${q.label}`).join('\n');
    
    let caption = `🎬 *${title || 'YouTube Video'}*\n${qLine}\n`;
    caption += `╭─〔 *ᴀᴠᴀɪʟᴀʙʟᴇ ǫᴜᴀʟɪᴛɪᴇꜱ* 〕─┈⊷\n${lines}\n╰─────────────┈⊷\n\n📩 *Reply* ɴᴜᴍʙᴇʀ ᴛᴏ ᴛʜɪꜱ ᴠɪᴅᴇᴏ ꜰᴏʀ ᴀɴᴏᴛʜᴇʀ ǫᴜᴀʟɪᴛʏ.\n`;
    caption += `\n> ${config.BOT_FOOTER}`;

    const sizeMB = buffer.length / (1024 * 1024);

    if (sizeMB > MAX_VIDEO_MB) {
        return await sock.sendMessage(chatId, {
            document: buffer,
            mimetype: 'video/mp4',
            fileName: `${safeName}.mp4`,
            caption,
            contextInfo: forwardContext()
        }, { quoted: msg });
    }
    try {
        return await sock.sendMessage(chatId, {
            video: buffer,
            mimetype: 'video/mp4',
            fileName: `${safeName}.mp4`,
            caption,
            contextInfo: forwardContext()
        }, { quoted: msg });
    } catch (e) {
        return await sock.sendMessage(chatId, {
            document: buffer,
            mimetype: 'video/mp4',
            fileName: `${safeName}.mp4`,
            caption,
            contextInfo: forwardContext()
        }, { quoted: msg });
    }
}

function getReplyStanzaId(msg) {
    const m = msg.message || {};
    return (
        (m.extendedTextMessage?.contextInfo?.stanzaId) ||
        (m.ephemeralMessage?.message?.extendedTextMessage?.contextInfo?.stanzaId) ||
        (m.viewOnceMessage?.message?.extendedTextMessage?.contextInfo?.stanzaId) ||
        (m.viewOnceMessageV2?.message?.extendedTextMessage?.contextInfo?.stanzaId) ||
        null
    );
}

module.exports = {
    name: 'yt',
    description: 'Download YouTube video (auto + quality selector)',
    category: 'downloaders',
    alias: ['ytmp4', 'yt', 'youtube'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        const input = args.join(" ").trim();

        // අලුත් command එකක් ආවම පරණ සෙෂන් එක අයින් කරනවා
        delPending(chatId, userId);

        try { await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } }); } catch (e) {}

        if (!input) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('ytmp4')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ʏᴛᴍᴘ4 <ꜱᴇᴀʀᴄʜ/ʟɪɴᴋ>\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            let finalUrl = input;
            let searchInfo = null;

            if (!input.includes("youtube.com") && !input.includes("youtu.be")) {
                const results = await yts(input);
                if (!results?.videos?.length) {
                    return sock.sendMessage(chatId, { text: "❌ No results found on YouTube.", contextInfo: forwardContext() }, { quoted: msg });
                }
                searchInfo = results.videos[0];
                finalUrl = searchInfo.url;
            }

            await sock.sendMessage(chatId, { text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ (720p HD)...\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });

            let title = searchInfo?.title;

            // Auto download (720p HD)
            try {
                const result = await tryDownloadQuality(finalUrl, '720');
                title = title || result.title || 'YouTube Video';
                const videoMsg = await sendVideoFile(sock, chatId, msg, result.buffer, title, '720p HD');
                
                if (videoMsg?.key?.id) {
                    setPending(chatId, userId, {
                        videoUrl: finalUrl,
                        title,
                        msgIds: [videoMsg.key.id]
                    });
                }
                try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}

            } catch (err) {
                console.error('YT auto download error:', err.message);
                try { await sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } }); } catch (e) {}
                
                // Auto fail උනොත් විතරක් හරි quality එක තෝරගන්න list එකක් යවනවා
                const lines = QUALITIES.map((q, i) => `│ *${i + 1}.* ${q.label}`).join('\n');
                const sent = await sock.sendMessage(chatId, {
                    text: `⚠️ *ᴀᴜᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ*\n\n╭─〔 *ᴀᴠᴀɪʟᴀʙʟᴇ ǫᴜᴀʟɪᴛɪᴇꜱ* 〕─┈⊷\n${lines}\n╰─────────────┈⊷\n\n📩 *Reply* ɴᴜᴍʙᴇʀ ꜰᴏʀ ᴀɴᴏᴛʜᴇʀ ǫᴜᴀʟɪᴛʏ.\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
                
                if (sent?.key?.id) {
                    setPending(chatId, userId, {
                        videoUrl: finalUrl,
                        title,
                        msgIds: [sent.key.id]
                    });
                }
            }

        } catch (err) {
            console.error('YTMP4 error:', err.message);
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            await sock.sendMessage(chatId, { text: `❌ Failed to process request.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
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
        const expectedIds = session.msgIds || [];
        
        if (repliedId && expectedIds.length && !expectedIds.includes(repliedId)) {
            return false; // වෙන message එකකට reply කරලා තියෙන්නේ
        }

        const idx = Number(m[1]) - 1;
        const q = QUALITIES[idx];
        if (!q) {
            await sock.sendMessage(chatId, { text: `❌ Invalid. Reply 1-${QUALITIES.length}.`, contextInfo: forwardContext() }, { quoted: msg });
            return true;
        }

        delPending(chatId, userId);

        try { await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } }); } catch (e) {}
        try {
            await sock.sendMessage(chatId, { text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ${q.label}...\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });

            const result = await tryDownloadQuality(session.videoUrl, q.key);
            const title = session.title || result.title || 'YouTube Video';
            
            const newVideoMsg = await sendVideoFile(sock, chatId, msg, result.buffer, title, q.label);

            // අලුත් වීඩියෝ එකට ආයෙ reply කරන්න පුළුවන් වෙන්න අලුත් session එකක් සේව් කරනවා
            if (newVideoMsg?.key?.id) {
                setPending(chatId, userId, {
                    videoUrl: session.videoUrl,
                    title,
                    msgIds: [newVideoMsg.key.id]
                });
            }

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
        } catch (err) {
            console.error('YT download error:', err.message);
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            await sock.sendMessage(chatId, { text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
        }
        return true;
    }
};