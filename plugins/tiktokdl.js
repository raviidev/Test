const axios = require('axios');
const fs = require('fs');
const config = require('../config');
const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const MAX_MEDIA_BYTES = Math.max(1024 * 1024, Number(process.env.MAX_MEDIA_BYTES) || 80 * 1024 * 1024);

/* Small caps helper */
const SC = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
    n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
const sc = (str) => String(str).toLowerCase().replace(/[a-z]/g, (ch) => SC[ch]);
const getTitle = (cmd) => `${sc(config.BOT_NAME)} </> ${sc(cmd)}`;

/* 🟢 Forward Context (NEWSLETTER_JID එක්ක) */
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

const BIZ_NODE = {
    tag: 'biz',
    attrs: {},
    content: [{
        tag: 'interactive',
        attrs: { type: 'native_flow', v: '1' },
        content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
    }]
};

async function sendApiButton(sock, jid, msg) {
    try {
        const media = await prepareWAMessageMedia(
            { image: { url: config.RCD_IMAGE_PATH } },
            { upload: sock.waUploadToServer }
        );

        const buttons = [{
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '🌐 ᴀᴘɪ ᴡᴇʙꜱɪᴛᴇ',
                url: 'https://api-nomo.zone.id/',
                merchant_url: 'https://api-nomo.zone.id/'
            })
        }];

        const content = generateWAMessageFromContent(
            jid,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            contextInfo: forwardContext(),
                            header: {
                                title: getTitle('api'),
                                hasMediaAttachment: true,
                                imageMessage: media.imageMessage
                            },
                            body: { text: '🌐 *ᴀᴘɪ ᴡᴇʙꜱɪᴛᴇ*\n\nᴠɪꜱɪᴛ ᴏᴜʀ ᴀᴘɪ ᴡᴇʙꜱɪᴛᴇ ꜰᴏʀ ᴍᴏʀᴇ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ.' },
                            footer: { text: config.BOT_FOOTER },
                            nativeFlowMessage: { buttons }
                        }
                    }
                }
            },
            { userJid: sock.user.id }
        );

        await sock.relayMessage(jid, content.message, {
            messageId: content.key.id,
            additionalNodes: [BIZ_NODE]
        });
    } catch (e) {
        console.log('API Button failed:', e.message);
    }
}

/* ------------------------------------------------------------------ */
/*  Data fetch logic                                                   */
/* ------------------------------------------------------------------ */
const API_BASE = 'https://infinity-api.sandaliamaya2012.workers.dev';
const OLD_API = 'https://api-rebix.zone.id/api/ttdl';
const TIMEOUT = 60000;
const TTL = 5 * 60 * 1000; // 5 mins

const QUALITIES = [
    { key: 'nowatermark', label: '🎬 Video (No Watermark)' },
    { key: 'watermark',   label: '📱 Video (Watermark)' },
    { key: 'audio',       label: '🎵 Audio (MP3)' }
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
    const keys = ['downloadUrl', 'download_url', 'dlink', 'dl', 'link', 'url', 'video', 'audio', 'file', 'direct_link'];
    for (const k of keys) if (typeof obj[k] === 'string' && /^https?:\/\//i.test(obj[k])) return obj[k];
    for (const k of Object.keys(obj)) {
        const r = findUrl(obj[k], depth + 1);
        if (r) return r;
    }
    return null;
}

function findTitle(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    const t = obj.title || obj.name || obj.desc;
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
    if (data?.status === false || data?.success === false) throw new Error(`${label}: ${data?.message || 'failure'}`);
    return data;
}

async function fetchBuf(url, label) {
    const res = await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 180000);
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error(`${label}: empty`);
    return buf;
}

/* ── Try Infinity API ── */
async function tryInfinity(url, quality) {
    const u = encodeURIComponent(url);
    let endpoint = '';
    
    if (quality === 'audio') {
        endpoint = `${API_BASE}/api/tiktok/audio?url=${u}`;
    } else {
        const q = quality === 'nowatermark' ? 'hd' : 'sd';
        endpoint = `${API_BASE}/api/tiktok/download?url=${u}&quality=${q}`;
    }

    const data = await getJSON(endpoint, `tiktok/${quality}`);
    const dlUrl = findUrl(data);
    if (!dlUrl) throw new Error('Infinity: no URL');
    
    const buf = await fetchBuf(dlUrl, 'tiktok file');
    return { buffer: buf, title: findTitle(data) };
}

/* ── Try Rebix Backup API ── */
async function tryRebix(url, quality) {
    if (quality === 'audio') throw new Error('Rebix does not support audio directly');
    
    const apiUrl = `${OLD_API}?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, { timeout: 20000 });

    if (!response.data.status || !response.data.result) throw new Error('rebix: failed');
    const result = response.data.result;
    
    const videoData = result.data?.find(item => item.type === (quality === 'nowatermark' ? 'nowatermark' : 'watermark'))
        || result.data?.find(item => item.type === (quality === 'nowatermark' ? 'nowatermark_hd' : 'watermark_hd'))
        || result.data?.[0];

    if (!videoData || !videoData.url) throw new Error('rebix: no URL');

    const videoResponse = await axios.get(videoData.url, { 
        responseType: 'arraybuffer', 
        timeout: 60000,
        maxContentLength: MAX_MEDIA_BYTES,
        maxBodyLength: MAX_MEDIA_BYTES
    });
    
    return { 
        buffer: Buffer.from(videoResponse.data), 
        title: result.title || 'TikTok Video' 
    };
}

/* ── Main Download Logic ── */
async function downloadMedia(url, quality) {
    try {
        console.log(`TikTok: trying Infinity (${quality})...`);
        return await tryInfinity(url, quality);
    } catch (e) {
        console.error('TikTok Infinity failed, trying backup:', e.message);
        console.log('TikTok: trying Rebix backup...');
        return await tryRebix(url, quality);
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

async function sendTikTokResult(sock, jid, msg, result, qualityKey, title) {
    const isAudio = qualityKey === 'audio';
    const qLabel = QUALITIES.find(q => q.key === qualityKey)?.label || 'Download';
    
    const lines = QUALITIES.map((q, i) => `│ *${i + 1}.* ${q.label}`).join('\n');
    
    let caption = `*ᴛɪᴋᴛᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n`;
    if (title) caption += `📝 *ᴛɪᴛʟᴇ:* ${title}\n`;
    caption += `🎞️ *ǫᴜᴀʟɪᴛʏ:* ${qLabel}\n\n`;
    caption += `╭─〔 *ᴀᴠᴀɪʟᴀʙʟᴇ ᴏᴘᴛɪᴏɴꜱ* 〕─┈⊷\n${lines}\n╰─────────────┈⊷\n\n`;
    caption += `📩 *Reply* ɴᴜᴍʙᴇʀ ᴛᴏ ᴛʜɪꜱ ᴍꜱɢ ꜰᴏʀ ᴀɴᴏᴛʜᴇʀ ꜰᴏʀᴍᴀᴛ.\n\n> ${config.BOT_FOOTER}`;

    if (isAudio) {
        return await sock.sendMessage(jid, {
            audio: result.buffer,
            mimetype: 'audio/mpeg',
            fileName: 'tiktok_audio.mp3',
            contextInfo: forwardContext()
        }, { quoted: msg });
    } else {
        return await sock.sendMessage(jid, {
            video: result.buffer,
            mimetype: 'video/mp4',
            fileName: 'tiktok_video.mp4',
            caption: caption,
            contextInfo: forwardContext()
        }, { quoted: msg });
    }
}

module.exports = {
    name: 'tiktok',
    description: 'Download TikTok videos (auto + format selector)',
    category: 'downloaders',
    alias: ['tt', 'tiktokdl', 'ttdl'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        delPending(chatId, userId); // clear old session

        try { await sock.sendMessage(chatId, { react: { text: '📥', key: msg.key } }); } catch (e) {}

        if (!args.length) {
            const helpText = `┌─ム ${getTitle('tiktok')}\n\n` +
                `╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n` +
                `│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴛɪᴋᴛᴏᴋ <ʟɪɴᴋ>\n` +
                `│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴛɪᴋᴛᴏᴋ https://vt.tiktok.com/ZSrRVYRUJ/\n` +
                `╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`;
            
            await sock.sendMessage(chatId, { text: helpText, contextInfo: forwardContext() }, { quoted: msg });
            await sendApiButton(sock, chatId, msg);
            return;
        }

        const url = args[0];

        if (!url.includes('tiktok.com')) {
            return await sock.sendMessage(chatId, { 
                text: `❌ ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ᴛɪᴋᴛᴏᴋ ʟɪɴᴋ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext() 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { 
                text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ (No Watermark)...\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });

            // Auto Download (No Watermark)
            const result = await downloadMedia(url, 'nowatermark');
            
            const videoMsg = await sendTikTokResult(sock, chatId, msg, result, 'nowatermark', result.title);
            
            if (videoMsg?.key?.id) {
                setPending(chatId, userId, {
                    url,
                    title: result.title,
                    msgIds: [videoMsg.key.id]
                });
            }

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
            
            // API Button eka yawanawa
            await sendApiButton(sock, chatId, msg);

        } catch (err) {
            console.error('TikTok Error:', err.message);
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            await sock.sendMessage(chatId, { 
                text: `❌ ᴇʀʀᴏʀ: ${err.message}\n\n> ${config.BOT_FOOTER}`,
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

            const result = await downloadMedia(session.url, q.key);
            
            // දැන් අලුත් media එක යවනවා, ඒකටත් ලිස්ට් එකම එකතු කරලා
            const newMsg = await sendTikTokResult(sock, chatId, msg, result, q.key, session.title);

            if (newMsg?.key?.id) {
                setPending(chatId, userId, {
                    url: session.url,
                    title: session.title,
                    msgIds: [newMsg.key.id]
                });
            }

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch (e) {}
        } catch (err) {
            console.error('TikTok download error:', err.message);
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            await sock.sendMessage(chatId, { text: `❌ ${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
        }
        return true;
    }
};
