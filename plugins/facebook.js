const axios = require('axios');
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
const OLD_API = 'https://api-rebix.zone.id/api/facebook';
const TIMEOUT = 60000;
const MAX_VIDEO_MB = 60;
const MAX_MEDIA_BYTES = Math.max(1024 * 1024, Number(process.env.MAX_MEDIA_BYTES) || 80 * 1024 * 1024);
const TTL = 5 * 60 * 1000;

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

function findAllUrls(obj, out = [], depth = 0) {
    if (!obj || depth > 6) return out;
    if (typeof obj === 'string') {
        if (/^https?:\/\//i.test(obj) && !/play\.google\.com/i.test(obj)) out.push(obj);
        return out;
    }
    if (typeof obj !== 'object') return out;
    for (const k of Object.keys(obj)) findAllUrls(obj[k], out, depth + 1);
    return out;
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

async function getJSON(url, label) {
    const res = await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const data = await res.json();
    if (data?.status === false || data?.success === false) throw new Error(`${label}: ${data?.message || data?.error || 'failure'}`);
    return data;
}

async function downloadBuf(url, label) {
    const res = await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 180000);
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const declaredSize = Number(res.headers.get('content-length'));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_MEDIA_BYTES) {
        throw new Error(`${label}: file exceeds ${Math.round(MAX_MEDIA_BYTES / 1048576)} MB limit`);
    }
    if (!res.body) throw new Error(`${label}: empty response`);
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
        size += chunk.length;
        if (size > MAX_MEDIA_BYTES) throw new Error(`${label}: file exceeds ${Math.round(MAX_MEDIA_BYTES / 1048576)} MB limit`);
        chunks.push(Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks, size);
    if (!buf.length) throw new Error(`${label}: empty`);
    return buf;
}

async function tryDownloadList(urls, title) {
    let lastErr;
    for (const url of urls.slice(0, 3)) {
        try {
            const buf = await downloadBuf(url, 'fb video');
            if (buf.length > 1024) return { buffer: buf, title };
        } catch (e) { lastErr = e; console.error('FB download failed:', e.message); }
    }
    throw lastErr || new Error('Download failed');
}

function qualityFallbacks(q) {
    const map = {
        '1080': ['1080', 'hd', '720'],
        '720':  ['720', 'hd', '1080'],
        '480':  ['480', 'sd', '360'],
        '360':  ['360', 'sd', '480'],
        'hd':   ['hd', '720', '1080'],
        'sd':   ['sd', '480', '360']
    };
    return map[q] || [q, 'hd', 'sd'];
}

async function tryInfinityQuality(fbUrl, quality) {
    const u = encodeURIComponent(fbUrl);
    const qChain = qualityFallbacks(quality);

    for (const q of qChain) {
        const attempts = [
            [`${API_BASE}/api/facebook/download?url=${u}&quality=${q}`, `download(${q})`],
            [`${API_BASE}/api/facebook/video?url=${u}&quality=${q}`, `video(${q})`]
        ];
        let urls = [], title = null;
        for (const [endpoint, label] of attempts) {
            try {
                const data = await getJSON(endpoint, label);
                if (!title) title = findTitle(data);
                const list = findAllUrls(data);
                if (list.length) { urls = list; break; }
            } catch (e) { console.error(`Infinity ${label} failed:`, e.message); }
        }
        if (urls.length) {
            try { return await tryDownloadList(urls, title); }
            catch (e) { console.error(`FB download q=${q} failed:`, e.message); }
        }
    }

    try {
        const info = await getJSON(`${API_BASE}/api/facebook/info?url=${u}`, 'info');
        const list = findAllUrls(info);
        if (list.length) return await tryDownloadList(list, findTitle(info));
    } catch (e) { console.error('Infinity info failed:', e.message); }

    throw new Error('Infinity: no video URL');
}

async function tryRebix(fbUrl) {
    const apiUrl = `${OLD_API}?url=${encodeURIComponent(fbUrl)}`;
    const response = await axios.get(apiUrl, { timeout: 20000 });

    if (!response.data.status || !response.data.result) throw new Error('rebix: failed');
    const result = response.data.result;
    const mediaList = result.media || [];
    const filteredLinks = mediaList.filter(l =>
        typeof l === 'string' && l.startsWith('http') && !l.includes('play.google.com')
    );
    if (!filteredLinks.length) throw new Error('rebix: no video URL');

    for (const videoUrl of filteredLinks.slice(0, 3)) {
        try {
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: MAX_MEDIA_BYTES,
                maxBodyLength: MAX_MEDIA_BYTES
            });
            return { buffer: Buffer.from(videoResponse.data), title: result.metadata?.title || null };
        } catch (e) { console.error('rebix dl failed:', e.message); }
    }
    throw new Error('rebix: all downloads failed');
}

async function downloadWithFallback(fbUrl, quality) {
    const errors = [];
    try {
        console.log(`FB: trying Infinity (${quality})...`);
        return await tryInfinityQuality(fbUrl, quality);
    } catch (e) {
        errors.push(`infinity: ${e.message}`);
        console.error('FB Infinity failed, trying backup:', e.message);
    }
    try {
        console.log('FB: trying rebix backup...');
        return await tryRebix(fbUrl);
    } catch (e) {
        errors.push(`rebix: ${e.message}`);
        console.error('FB rebix failed:', e.message);
    }
    throw new Error(errors.join(' | '));
}

async function fetchInfo(fbUrl) {
    try {
        const u = encodeURIComponent(fbUrl);
        const info = await getJSON(`${API_BASE}/api/facebook/info?url=${u}`, 'info');
        return { title: findTitle(info) };
    } catch (e) {
        return { title: null };
    }
}

async function logDebug(fbUrl) {
    try {
        const r = await fetchT(`${API_BASE}/api/facebook/debug?url=${encodeURIComponent(fbUrl)}`, {}, 15000);
        console.log('FB debug:', (await r.text()).slice(0, 1500));
    } catch (e) { console.log('FB debug failed:', e.message); }
}

async function sendVideoFile(sock, chatId, msg, result, title, qualityLabel, qListText) {
    const safeName = (title || 'fbvideo').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'fbvideo';
    const qLine = qualityLabel ? `🎞️ *ǫᴜᴀʟɪᴛʏ:* ${qualityLabel}\n` : '';
    
    // Caption එකට quality list එකම එකතු කරනවා
    let caption = `📹 *ꜰᴀᴄᴇʙᴏᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n📝 *ᴛɪᴛʟᴇ:* ${title || 'Facebook Video'}\n${qLine}\n`;
    
    if (qListText) {
        caption += `╭─〔 *ᴀᴠᴀɪʟᴀʙʟᴇ ǫᴜᴀʟɪᴛɪᴇꜱ* 〕─┈⊷\n${qListText}\n╰─────────────┈⊷\n\n📩 *Reply* ɴᴜᴍʙᴇʀ ᴛᴏ ᴛʜɪꜱ ᴠɪᴅᴇᴏ ꜰᴏʀ ᴀɴᴏᴛʜᴇʀ ǫᴜᴀʟɪᴛʏ.\n`;
    }
    
    caption += `\n> ${config.BOT_FOOTER}`;

    const sizeMB = result.buffer.length / (1024 * 1024);

    if (sizeMB > MAX_VIDEO_MB) {
        return await sock.sendMessage(chatId, {
            document: result.buffer,
            mimetype: 'video/mp4',
            fileName: `${safeName}.mp4`,
            caption,
            contextInfo: forwardContext()
        }, { quoted: msg });
    }
    try {
        return await sock.sendMessage(chatId, {
            video: result.buffer,
            mimetype: 'video/mp4',
            fileName: `${safeName}.mp4`,
            caption,
            contextInfo: forwardContext()
        }, { quoted: msg });
    } catch (e) {
        return await sock.sendMessage(chatId, {
            document: result.buffer,
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
    name: 'facebook',
    description: 'Download Facebook videos (auto + quality selector)',
    category: 'downloaders',
    alias: ['fb', 'fbdl', 'facebookdl'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '📥', key: msg.key } }); } catch (e) {}

        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: `┌─ム ${getTitle('facebook')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ꜰʙ <ʟɪɴᴋ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ꜰʙ https://www.facebook.com/share/r/12Jhv1vQ85G/\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        const url = args[0];

        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return sock.sendMessage(chatId, {
                text: `❌ ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ꜰᴀᴄᴇʙᴏᴏᴋ ʟɪɴᴋ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            const info = await fetchInfo(url);

            await sock.sendMessage(chatId, {
                text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ (720p HD)...\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });

            let videoMsgId = null;
            let title = info.title;
            const lines = QUALITIES.map((q, i) => `│ *${i + 1}.* ${q.label}`).join('\n');

            try {
                const result = await downloadWithFallback(url, '720');
                title = info.title || result.title || 'Facebook Video';
                
                // වීඩියෝ එක send කරද්දීම caption එකට quality list එක දෙනවා
                const videoMsg = await sendVideoFile(sock, chatId, msg, result, title, '720p HD', lines);
                videoMsgId = videoMsg?.key?.id || null;
                
                try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
            } catch (err) {
                console.error('FB auto download error:', err.message);
                try { await sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } }); } catch (e) {}
                await logDebug(url);
                
                // Auto download එක fail උනොත් විතරක් quality list එක වෙනම යවනවා
                const sent = await sock.sendMessage(chatId, {
                    text: `⚠️ *ᴀᴜᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ*\n\n╭─〔 *ᴀᴠᴀɪʟᴀʙʟᴇ ǫᴜᴀʟɪᴛɪᴇꜱ* 〕─┈⊷\n${lines}\n╰─────────────┈⊷\n\n📩 *Reply* ɴᴜᴍʙᴇʀ ꜰᴏʀ ᴀɴᴏᴛʜᴇʀ ǫᴜᴀʟɪᴛʏ.\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
                videoMsgId = sent?.key?.id || null;
            }

            if (videoMsgId) {
                setPending(chatId, userId, {
                    fbUrl: url,
                    title,
                    msgIds: [videoMsgId]
                });
                console.log(`[FB] session saved: msgIds=${videoMsgId}, user=${userId}`);
            }

        } catch (err) {
            console.error('FB execute error:', err.message);
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            await sock.sendMessage(chatId, {
                text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    },

    async handleReply(sock, msg, body, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const m = String(body).trim().match(/^(\d+)$/);
        if (!m) return false;

        const session = getPending(chatId, userId);
        if (!session) return false;

        console.log(`[FB handleReply] body="${body}" user=${userId}`);

        const repliedId = getReplyStanzaId(msg);
        const expectedIds = session.msgIds || [];
        if (repliedId && expectedIds.length && !expectedIds.includes(repliedId)) {
            console.log(`[FB] reply target mismatch: repliedId=${repliedId}, expected=${expectedIds.join(',')}`);
            return false;
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
            await sock.sendMessage(chatId, {
                text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ${q.label}...\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });

            const result = await downloadWithFallback(session.fbUrl, q.key);
            const title = session.title || result.title || 'Facebook Video';
            
            // අලුත් quality එකෙන් එන වීඩියෝ එකටත් ආයෙ list එකම දෙනවා
            const lines = QUALITIES.map((qq, i) => `│ *${i + 1}.* ${qq.label}`).join('\n');
            const newVideoMsg = await sendVideoFile(sock, chatId, msg, result, title, q.label, lines);

            // අලුත් වීඩියෝ එකට ආයෙ reply කරන්න පුළුවන් වෙන්න අලුත් session එකක් සේව් කරනවා
            if (newVideoMsg?.key?.id) {
                setPending(chatId, userId, {
                    fbUrl: session.fbUrl,
                    title,
                    msgIds: [newVideoMsg.key.id]
                });
            }

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
        } catch (err) {
            console.error('FB download error:', err.message);
            await logDebug(session.fbUrl);
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            await sock.sendMessage(chatId, {
                text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
        return true;
    }
};
