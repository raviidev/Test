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
    name: 'guessgender',
    description: 'Check gender of a person by name.',
    category: 'fun',
    alias: ['gender'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🔮', key: msg.key } }); } catch (e) {}

        // Args walin nama gannawa
        const q = args.join(' ').trim();

        if (!q) {
            return await sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('guessgender')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔮 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ɢᴜᴇꜱꜱɢᴇɴᴅᴇʀ <ɴᴀᴍᴇ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ɢᴜᴇꜱꜱɢᴇɴᴅᴇʀ ɪᴍʀᴀɴ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg }); 
        }

        try {
            const apiUrl = `https://api.genderize.io/?name=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl);
            const result = response.data;

            // API eken valid gender ekak awada balanawa
            if (result && result.gender) {
                const probability = result.probability || 0;
                const probabilityPercent = (probability * 100).toFixed(1);
                const genderTitle = result.gender.charAt(0).toUpperCase() + result.gender.slice(1);
                
                const responseText = `┌─ム ${getTitle('guessgender')}\n\n` +
                                     `╭─〔 *ɢᴇɴᴅᴇʀ ʀᴇꜱᴜʟᴛ* 〕─┈⊷\n` +
                                     `│ 📝 *ɴᴀᴍᴇ:* ${result.name}\n` +
                                     `│ ⚥ *ɢᴇɴᴅᴇʀ:* ${genderTitle}\n` +
                                     `│ 📊 *ᴘʀᴏʙᴀʙɪʟɪᴛʏ:* ${probabilityPercent}%\n` +
                                     `│ 🔢 *ᴄᴏᴜɴᴛ:* ${result.count}\n` +
                                     `╰─────────────┈⊷\n\n` +
                                     `> ${config.BOT_FOOTER}`;
                                     
                await sock.sendMessage(chatId, { 
                    text: responseText,
                    contextInfo: forwardContext()
                }, { quoted: msg }); 
            } else {
                await sock.sendMessage(chatId, { 
                    text: `❌ ᴜɴᴀʙʟᴇ ᴛᴏ ᴅᴇᴛᴇʀᴍɪɴᴇ ɢᴇɴᴅᴇʀ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ ᴡɪᴛʜ ᴀɴᴏᴛʜᴇʀ ɴᴀᴍᴇ.\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg }); 
            }
        } catch (err) {
            console.error('❌ GuessGender plugin error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ *ᴇʀʀᴏʀ:* ${err.message || 'ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰᴇᴛᴄʜ ᴅᴀᴛᴀ.'}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg }); 
        }
    },
};