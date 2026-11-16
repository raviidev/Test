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
    name: 'textpro',
    description: 'Generate text effects with various styles',
    category: 'tools',
    alias: ['txtpro', 'texteffect', 'te'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🎨', key: msg.key } }); } catch (e) {}

        try {
            let style = 'neon';
            let textToGen = args.join(' ').trim();
            
            if (textToGen.includes('|')) {
                const parts = textToGen.split('|');
                style = parts[0].trim().toLowerCase();
                textToGen = parts.slice(1).join('|').trim();
            }
            
            const validStyles = ['neon', 'glitter', 'fire', 'shadow', 'gradient', 'dropwater', 'cloud', 'pixel', 'underwater','summer','thunder','pencil','leaves'];
            const firstWord = args[0]?.toLowerCase();
            
            if (validStyles.includes(firstWord) && args.length > 1) {
                style = firstWord;
                textToGen = args.slice(1).join(' ').trim();
            }
            
            if (!textToGen) {
                const stylesList = `┌─ム ${getTitle('textpro')}\n\n` +
                    `╭─〔 *ᴀᴠᴀɪʟᴀʙʟᴇ ꜱᴛʏʟᴇꜱ* 〕─┈⊷\n` +
                    `│ ✦ ɴᴇᴏɴ       » ɴᴇᴏɴ ʟɪɢʜᴛ\n` +
                    `│ ✦ ɢʟɪᴛᴛᴇʀ    » ɢʟɪᴛᴛᴇʀ ᴛᴇxᴛ\n` +
                    `│ ✦ ꜰɪʀᴇ       » ꜰɪʀᴇ ᴛᴇxᴛ\n` +
                    `│ ✦ ꜱʜᴀᴅᴏᴡ     » 3ᴅ ꜱʜᴀᴅᴏᴡ\n` +
                    `│ ✦ ɢʀᴀᴅɪᴇɴᴛ   » ɢʀᴀᴅɪᴇɴᴛ\n` +
                    `│ ✦ ᴅʀᴏᴘᴡᴀᴛᴇʀ  » ᴅʀᴏᴘᴡᴀᴛᴇʀ\n` +
                    `│ ✦ ᴄʟᴏᴜᴅ      » ᴄʟᴏᴜᴅ ꜱᴋʏ\n` +
                    `│ ✦ ᴘɪxᴇʟ      » 3ᴅ ᴘɪxᴇʟ\n` +
                    `│ ✦ ᴜɴᴅᴇʀᴡᴀᴛᴇʀ » ᴜɴᴅᴇʀᴡᴀᴛᴇʀ\n` +
                    `│ ✦ ꜱᴜᴍᴍᴇʀ     » ꜱᴜᴍᴍᴇʀ\n` +
                    `│ ✦ ᴛʜᴜɴᴅᴇʀ    » ᴛʜᴜɴᴅᴇʀ\n` +
                    `│ ✦ ᴘᴇɴᴄɪʟ     » ᴘᴇɴᴄɪʟ\n` +
                    `│ ✦ ʟᴇᴀᴠᴇꜱ     » ʟᴇᴀᴠᴇꜱ\n` +
                    `╰─────────────┈⊷\n\n` +
                    `📝 *ᴜꜱᴀɢᴇ ᴇxᴀᴍᴘʟᴇꜱ:*\n` +
                    `• ${prefix}ᴛᴇxᴛᴘʀᴏ ᴍᴏᴠɪᴇx\n` +
                    `• ${prefix}ᴛᴇxᴛᴘʀᴏ ɴᴇᴏɴ | ɴᴏᴍᴏ\n` +
                    `• ${prefix}ᴛᴇxᴛᴘʀᴏ ᴄʟᴏᴜᴅ ʜᴇʟʟᴏ ᴡᴏʀʟᴅ\n\n` +
                    `> ${config.BOT_FOOTER}`;
                    
                return sock.sendMessage(chatId, { 
                    text: stylesList,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

            await sock.sendMessage(chatId, { 
                text: `⏳ ɢᴇɴᴇʀᴀᴛɪɴɢ ᴛᴇxᴛ ᴇꜰꜰᴇᴄᴛ...\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });

            const apiUrl = `https://api-abztech.zone.id/tools/textpro?text=${encodeURIComponent(textToGen)}&style=${style}`;
            
            const imageBuffer = await axios.get(apiUrl, {
                responseType: 'arraybuffer'
            }).then(res => res.data);

            const caption = `┌─ム ${getTitle('textpro')}\n\n` +
                `╭─〔 *ᴛᴇxᴛ ᴇꜰꜰᴇᴄᴛ* 〕─┈⊷\n` +
                `│ 📝 *ᴛᴇxᴛ:* ${textToGen}\n` +
                `│ 🎨 *ꜱᴛʏʟᴇ:* ${style.toUpperCase()}\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            // Image eka yawanawa (Forwarded context ekath ekka)
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: caption,
                contextInfo: forwardContext() // 👈 context info eka methana dammah
            }, { quoted: msg });

        } catch (error) {
            console.error('Error in textpro command:', error.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ɪᴍᴀɢᴇ. ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.\n\n${error.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};