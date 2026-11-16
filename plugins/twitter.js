const axios = require('axios');
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

module.exports = {
    name: 'twitter',
    description: 'Download Twitter/X videos',
    category: 'downloaders',
    alias: ['x', 'xdl', 'twdl'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '📥', key: msg.key } }); } catch (e) {}

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('twitter')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴛᴡɪᴛᴛᴇʀ <ʟɪɴᴋ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴛᴡɪᴛᴛᴇʀ https://x.com/...\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        const url = args[0];

        if (!url.includes('twitter.com') && !url.includes('x.com')) {
            return sock.sendMessage(chatId, { 
                text: `❌ ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ᴛᴡɪᴛᴛᴇʀ/х ʟɪɴᴋ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴛᴡɪᴛᴛᴇʀ ᴠɪᴅᴇᴏ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const apiUrl = `https://api-rebix.zone.id/api/xdl?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);

            // API එකේ රෙස්පොන්ස් එක නිකම්ම එන්නත් පුළුවන් නිසා පරෙස්සමින් හැන්ඩ්ල් කරනවා
            const result = response.data.result || response.data.data || response.data;
            
            // වීඩියෝ ලින්ක් එක හොයාගන්නවා (එක වෙනස් වෙන්න පුළුවන්)
            let mediaUrl = result.url || result.video || result.media?.[0]?.url || result.videos?.[0]?.url;
            if (Array.isArray(result)) mediaUrl = result[0]?.url || result[0];

            if (!mediaUrl || typeof mediaUrl !== 'string') {
                throw new Error('ᴄᴏᴜʟᴅ ɴᴏᴛ ꜰɪɴᴅ ᴍᴇᴅɪᴀ ᴜʀʟ ɪɴ ᴀᴘɪ ʀᴇꜱᴘᴏɴꜱᴇ');
            }

            const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(mediaResponse.data);
            const caption = `🐦 *ᴛᴡɪᴛᴛᴇʀ/х ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n> ${config.BOT_FOOTER}`;

            // වීඩියෝ එකක්ද නැද්ද කියලා බලලා යවනවා
            if (mediaUrl.includes('.mp4') || result.type === 'video') {
                await sock.sendMessage(chatId, { video: buffer, mimetype: 'video/mp4', caption, contextInfo: forwardContext() }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { image: buffer, caption, contextInfo: forwardContext() }, { quoted: msg });
            }

        } catch (err) {
            console.error('Twitter Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ᴇʀʀᴏʀ: ${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};