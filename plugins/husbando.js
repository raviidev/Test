const axios = require('axios');
const config = require('../config');

/* Small caps helper */
const SC = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
    n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
const sc = (str) => String(str).toLowerCase().replace(/[a-z]/g, (ch) => SC[ch]);
const getTitle = (cmd) => `${sc(config.BOT_NAME)} </> ${sc(cmd)}`;

/* Forward Context */
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
    name: 'husbando',
    description: 'Sends a random anime husbando image',
    category: 'anime',
    alias: ['husbandopic', 'animeboy'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '💙', key: msg.key } }); } catch (e) {}

        await sock.sendMessage(chatId, { 
            text: `⏳ ꜰᴇᴛᴄʜɪɴɢ ʜᴜꜱʙᴀɴᴅᴏ ɪᴍᴀɢᴇ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const res = await axios.get('https://nekos.best/api/v2/husbando');
            
            if (!res.data || !res.data.results || res.data.results.length === 0) {
                throw new Error('ɴᴏ ɪᴍᴀɢᴇ ꜰᴏᴜɴᴅ ɪɴ ᴀᴘɪ ʀᴇꜱᴘᴏɴꜱᴇ.');
            }

            const imageUrl = res.data.results[0].url;
            
            // Image eka yawanawa (Forwarded context ekath ekka)
            await sock.sendMessage(chatId, { 
                image: { url: imageUrl },
                caption: `┌─ム ${getTitle('husbando')}\n\n💙 ʜᴜꜱʙᴀɴᴅᴏ, ʜᴇʀᴇ ᴡᴇ ɢᴏ! 😊\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext() 
            }, { quoted: msg });

        } catch (err) {
            console.error('❌ Error fetching husbando image:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰᴇᴛᴄʜ ʜᴜꜱʙᴀɴᴅᴏ ɪᴍᴀɢᴇ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};