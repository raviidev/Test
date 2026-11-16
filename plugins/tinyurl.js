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
    name: 'tinyurl',
    description: 'Shorten a URL',
    category: 'tools',
    alias: ['shorturl', 'short'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🔗', key: msg.key } }); } catch (e) {}

        const url = args[0];

        if (!url || !url.startsWith('http')) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('tinyurl')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴛɪɴʏᴜʀʟ <ᴜʀʟ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴛɪɴʏᴜʀʟ https://google.com\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ꜱʜᴏʀᴛᴇɴɪɴɢ ᴜʀʟ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const apiUrl = `https://api-rebix.zone.id/api/tinyurl?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            // API eken ena short url eka hoyagannawa
            let shortUrl = null;
            if (data.status && data.result) {
                shortUrl = typeof data.result === 'string' ? data.result : (data.result.shorturl || data.result.url);
            }

            if (!shortUrl) {
                throw new Error('ᴀᴘɪ ʀᴇᴛᴜʀɴᴇᴅ ᴀɴ ɪɴᴠᴀʟɪᴅ ʀᴇꜱᴘᴏɴꜱᴇ.');
            }

            const replyText = `┌─ム ${getTitle('tinyurl')}\n\n` +
                `╭─〔 *ᴜʀʟ ꜱʜᴏʀᴛᴇɴᴇʀ* 〕─┈⊷\n` +
                `│ 📎 *ᴏʀɪɢɪɴᴀʟ:*\n│ ${url}\n` +
                `│\n` +
                `│ 🔗 *ꜱʜᴏʀᴛ ᴜʀʟ:*\n│ ${shortUrl}\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, { 
                text: replyText,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('TinyURL Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ꜱʜᴏʀᴛᴇɴ ᴜʀʟ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};