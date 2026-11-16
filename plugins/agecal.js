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
    name: 'agecalculator',
    description: 'Calculate age with detailed breakdown',
    category: 'tools',
    alias: ['age', 'calcage'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🎂', key: msg.key } }); } catch (e) {}

        // Args walin date eka gannawa
        const q = args.join(' ').trim();

        if (!q) {
            return await sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('agecalculator')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🎂 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴀɢᴇᴄᴀʟᴄᴜʟᴀᴛᴏʀ <ᴍᴍ/ᴅᴅ/ʏʏʏʏ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴀɢᴇᴄᴀʟᴄᴜʟᴀᴛᴏʀ 01/01/2000\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            // API eken age data eka gannawa
            const apiUrl = `https://zaid-bhi-calculate-age.vercel.app/api/calculate?age=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (!data || !data.age) {
                throw new Error('ɪɴᴠᴀʟɪᴅ ᴅᴀᴛᴇ ꜰᴏʀᴍᴀᴛ ᴏʀ ᴀᴘɪ ᴇʀʀᴏʀ');
            }

            const responseText = `┌─ム ${getTitle('agecalculator')}\n\n` +
                `╭─〔 *ᴀɢᴇ ᴅᴇᴛᴀɪʟꜱ* 〕─┈⊷\n` +
                `│ 🎂 *ᴀɢᴇ:* ${data.age}\n` +
                `│ 📅 *ᴀɢᴇ ɪɴ ᴍᴏɴᴛʜꜱ:* ${data["age-in-Months"]}\n` +
                `│ 📆 *ᴀɢᴇ ɪɴ ᴅᴀʏꜱ:* ${data["age-in-Days"]}\n` +
                `│ 📌 *ᴀɢᴇ ɪɴ ᴡᴇᴇᴋꜱ:* ${data["age-in-Weeks"]}\n` +
                `│ ⏰ *ᴀɢᴇ ɪɴ ʜᴏᴜʀꜱ:* ${data["age-in-Hours"]}\n` +
                `│ ⏱️ *ᴀɢᴇ ɪɴ ᴍɪɴᴜᴛᴇꜱ:* ${data["age-in-Minutes"]}\n` +
                `│ ⏳ *ᴀɢᴇ ɪɴ ꜱᴇᴄᴏɴᴅꜱ:* ${data["age-in-Seconds"]}\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, { 
                text: responseText,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('❌ Agecalculator plugin error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ *ᴇʀʀᴏʀ:* ꜰᴀɪʟᴇᴅ ᴛᴏ ᴄᴀʟᴄᴜʟᴀᴛᴇ ᴀɢᴇ.\nᴘʟᴇᴀꜱᴇ ᴄʜᴇᴄᴋ ᴛʜᴇ ᴅᴀᴛᴇ ꜰᴏʀᴍᴀᴛ (ᴇ.ɢ., ᴍᴍ/ᴅᴅ/ʏʏʏʏ).\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    },
};