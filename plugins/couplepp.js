const axios = require('axios');
const config = require('../config');

const SC = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ' };
const sc = (str) => String(str).toLowerCase().replace(/[a-z]/g, (ch) => SC[ch] || ch);
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
    name: 'couplepp',
    description: 'Random couple profile pictures',
    category: 'fun',
    alias: ['couple', 'cpp'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        
        try { await sock.sendMessage(chatId, { react: { text: '❤️', key: msg.key } }); } catch (e) {}

        await sock.sendMessage(chatId, { 
            text: `⏳ ꜰᴇᴛᴄʜɪɴɢ ᴄᴏᴜᴘʟᴇ ᴘᴘ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const apiUrl = `https://api-rebix.zone.id/api/couplepp`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const data = response.data;

            let img1 = null;
            let img2 = null;

            // ✅ මෙතනදි API එකෙන් එන data.male සහ data.female අල්ලගන්නවා
            if (data && data.status && data.data) {
                img1 = data.data.male;
                img2 = data.data.female;
            }

            if (!img1 || !img2) {
                throw new Error('ᴄᴏᴜʟᴅ ɴᴏᴛ ꜰɪɴᴅ ɪᴍᴀɢᴇꜱ ɪɴ ᴀᴘɪ ʀᴇꜱᴘᴏɴꜱᴇ.');
            }

            const caption = `┌─ム ${getTitle('couplepp')}\n\n` +
                `╭─〔 *ᴄᴏᴜᴘʟᴇ ᴘᴘ* 〕─┈⊷\n` +
                `│ 💞 ʜᴇʀᴇ ᴀʀᴇ ʏᴏᴜʀ ᴄᴏᴜᴘʟᴇ ᴘʀᴏꜰɪʟᴇ ᴘɪᴄᴛᴜʀᴇꜱ!\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            // 1. පළවෙනි image එක (Male)
            await sock.sendMessage(chatId, { 
                image: { url: img1 }, 
                caption: caption,
                contextInfo: forwardContext() 
            }, { quoted: msg });

            // 2. දෙවෙනි image එක (Female)
            await sock.sendMessage(chatId, { 
                image: { url: img2 },
                contextInfo: forwardContext() 
            }, { quoted: msg });

        } catch (err) {
            console.error('CouplePP Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰᴇᴛᴄʜ ᴄᴏᴜᴘʟᴇ ᴘᴘ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};