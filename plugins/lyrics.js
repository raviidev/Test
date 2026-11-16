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
    name: 'lyrics',
    description: 'Search song lyrics',
    category: 'search',
    alias: ['lyric', 'lirik'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } }); } catch (e) {}

        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('lyrics')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🎵 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ʟʏʀɪᴄꜱ <ꜱᴏɴɢ ɴᴀᴍᴇ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ʟʏʀɪᴄꜱ ᴘᴇʀꜰᴇᴄᴛ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ꜱᴇᴀʀᴄʜɪɴɢ ʟʏʀɪᴄꜱ ꜰᴏʀ "${query}"...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const apiUrl = `https://api-rebix.zone.id/api/lyrics?q=${encodeURIComponent(query)}`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            // API response eka check karanawa
            if (!data || !data.status || !data.result) {
                throw new Error('ɴᴏ ʟʏʀɪᴄꜱ ꜰᴏᴜɴᴅ ꜰᴏʀ ᴛʜɪꜱ ꜱᴏɴɢ.');
            }

            // Data eka extract karanawa (API eke format eka anuwa wenas wenna puluwan)
            const result = data.result;
            const title = result.title || result.track || query;
            const artist = result.artist || result.author || 'ᴜɴᴋɴᴏᴡɴ';
            let lyrics = result.lyrics || result.text || 'ɴᴏ ʟʏʀɪᴄꜱ ᴘʀᴏᴠɪᴅᴇᴅ.';

            // WhatsApp limit ekata kapenawa
            const safeLyrics = lyrics.slice(0, 3000);

            const replyText = `┌─ム ${getTitle('lyrics')}\n\n` +
                `╭─〔 *ʟʏʀɪᴄꜱ* 〕─┈⊷\n` +
                `│ 🎵 *ᴛɪᴛʟᴇ:* ${title}\n` +
                `│ 👤 *ᴀʀᴛɪꜱᴛ:* ${artist}\n` +
                `│\n` +
                `│ 📝 *ʟʏʀɪᴄꜱ:*\n` +
                `│ ${safeLyrics.replace(/\n/g, '\n│ ')}\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, { 
                text: replyText,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('Lyrics Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰɪɴᴅ ʟʏʀɪᴄꜱ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};