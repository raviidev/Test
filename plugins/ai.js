const axios = require('axios');
const config = require('../config');

/* Small caps helper */
const SC = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
    n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
const sc = (str) => String(str).toLowerCase().replace(/[a-z]/g, (ch) => SC[ch]);
const getTitle = (cmd) => `${sc(config.BOT_NAME)} </> ${sc(cmd)}`;

/* Forward Context (NEWSLETTER_JID එක්ක) */
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
    name: 'ai',
    description: 'Chat with AI',
    category: 'ai',
    alias: ['gemini', 'gpt', 'chat'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🤖', key: msg.key } }); } catch (e) {}

        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('ai')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🤖 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴀɪ <ʏᴏᴜʀ ǫᴜᴇꜱᴛɪᴏɴ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴀɪ ᴡʜᴀᴛ ɪꜱ ᴛʜᴇ ᴄᴀᴘɪᴛᴀʟ ᴏꜰ ꜱʀɪ ʟᴀɴᴋᴀ?\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ᴛʜɪɴᴋɪɴɢ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const apiUrl = `https://api-rebix.zone.id/api/gemini?q=${encodeURIComponent(query)}`;
            const response = await axios.get(apiUrl);
            
            const data = response.data;

            // API status eka check karanawa
            if (!data || !data.status || !data.message) {
                throw new Error('ᴀᴘɪ ʀᴇᴛᴜʀɴᴇᴅ ᴀɴ ɪɴᴠᴀʟɪᴅ ʀᴇꜱᴘᴏɴꜱᴇ');
            }

            // Message eka gannawa
            const aiResponse = data.message;

            // WhatsApp limit ekata kapenawa
            const safeResponse = String(aiResponse).slice(0, 3500);

            const resultText = `┌─ム ${getTitle('ai')}\n\n` +
                `╭─〔 *ᴀɪ ʀᴇꜱᴘᴏɴꜱᴇ* 〕─┈⊷\n` +
                `│ 🤖 *ᴀɴꜱᴡᴇʀ:*\n` +
                `│ ${safeResponse}\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, { 
                text: resultText,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('AI Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ɢᴇᴛ ᴀɪ ʀᴇꜱᴘᴏɴꜱᴇ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};