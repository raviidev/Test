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
    name: 'instadl',
    description: 'Download Instagram media',
    category: 'downloaders',
    alias: ['insta', 'instagram', 'ig'],
    
    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        
        try { await sock.sendMessage(chatId, { react: { text: '📥', key: msg.key } }); } catch (e) {}

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('instadl')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ɪɢ <ʟɪɴᴋ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ɪɢ https://www.instagram.com/reel/xxxxxx\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
        
        const url = args[0];
        
        if (!url.includes('instagram.com')) {
            return sock.sendMessage(chatId, { 
                text: `❌ ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ɪɴꜱᴛᴀɢʀᴀᴍ ʟɪɴᴋ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
        
        await sock.sendMessage(chatId, { 
            text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ɪɴꜱᴛᴀɢʀᴀᴍ ᴍᴇᴅɪᴀ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });
        
        try {
            const apiUrl = `https://api-rebix.zone.id/api/igdl?quality=480&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });
            
            if (!response.data.status || !response.data.result) {
                throw new Error('API returned error');
            }
            
            const result = response.data.result;
            const metadata = result.metadata;
            const mediaUrl = result.url[0];
            
            const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const buffer = Buffer.from(mediaResponse.data);
            
            const caption = `📸 *ɪɴꜱᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
                            `👤 *ᴜꜱᴇʀ:* ${metadata.username}\n` +
                            `❤️ *ʟɪᴋᴇꜱ:* ${metadata.like}\n` +
                            `💬 *ᴄᴏᴍᴍᴇɴᴛꜱ:* ${metadata.comment}\n` +
                            `📝 *ᴄᴀᴘᴛɪᴏɴ:* ${metadata.caption || 'ɴᴏ ᴄᴀᴘᴛɪᴏɴ'}\n\n` +
                            `> ${config.BOT_FOOTER}`;
            
            if (metadata.isVideo) {
                await sock.sendMessage(chatId, { video: buffer, mimetype: 'video/mp4', caption, contextInfo: forwardContext() }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { image: buffer, caption, contextInfo: forwardContext() }, { quoted: msg });
            }
            
        } catch (err) {
            console.error('instadl error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ɪɴꜱᴛᴀɢʀᴀᴍ ᴍᴇᴅɪᴀ\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};