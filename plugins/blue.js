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
    name: 'bluearchive',
    description: 'Send a random Blue Archive image',
    category: 'fun',
    alias: ['ba', 'blue'],
    
    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🖼️', key: msg.key } }); } catch (e) {}

        await sock.sendMessage(chatId, { 
            text: `⏳ ꜰᴇᴛᴄʜɪɴɢ ʙʟᴜᴇ ᴀʀᴄʜɪᴠᴇ ɪᴍᴀɢᴇ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });
        
        try {
            const imageUrl = `https://api-rebix.zone.id/api/bluearchive`;
            
            const response = await axios({
                method: 'get',
                url: imageUrl,
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            const buffer = Buffer.from(response.data);
            
            // Image eka yawanawa (Forward context ekath ekka)
            await sock.sendMessage(chatId, { 
                image: buffer, 
                caption: `┌─ム ${getTitle('bluearchive')}\n\n┌─ム ᴏᴋᴀʏ ꜰᴏʀ ʏᴏᴜ?\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext() 
            }, { quoted: msg });
            
        } catch (err) {
            console.error('bluearchive error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰᴇᴛᴄʜ ɪᴍᴀɢᴇ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};