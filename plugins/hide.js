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
    name: 'readmore',
    description: 'Create WhatsApp read more messages',
    category: 'tools',
    alias: ['hide'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🤫', key: msg.key } }); } catch (e) {}

        // Args walin text eka gannawa
        const q = args.join(' ').trim();

        if (!q) {
            return await sock.sendMessage(chatId, {
                text: `┌─ム ${getTitle('hide')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🤫 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ʜɪᴅᴇ <ᴛɪᴛʟᴇ>, <ʜɪᴅᴅᴇɴ ᴛᴇxᴛ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ʜɪᴅᴇ ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ 🌞, ʜᴀᴠᴇ ᴀ ɴɪᴄᴇ ᴅᴀʏ!\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            let output = q;

            if (q.includes(',')) {
                const parts = q.split(',');
                const title = parts.shift().trim();
                const hiddenText = parts.join(',').trim();

                output = `${title}\n\n${'\u200e'.repeat(4001)}${hiddenText}`;
            } else {
                output = `\u200e${q}`;
                output = '\u200e'.repeat(4001) + q;
            }

            // Forwarded context eka ekath ekka yawanawa
            await sock.sendMessage(chatId, {
                text: output,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('❌ ɴᴏᴍᴏ ᴍᴅ </> ReadMore Error:', err.message);
            await sock.sendMessage(chatId, {
                text: `❌ *ᴇʀʀᴏʀ:* ${err.message || 'ꜰᴀɪʟᴇᴅ ᴛᴏ ᴄʀᴇᴀᴛᴇ ʀᴇᴀᴅ ᴍᴏʀᴇ ᴍᴇꜱꜱᴀɢᴇ.'}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};