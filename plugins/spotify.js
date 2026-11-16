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
    name: 'spotify',
    description: 'Download Spotify songs',
    category: 'downloaders',
    alias: ['sp', 'spdl'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } }); } catch (e) {}

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('spotify')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ꜱᴘᴏᴛɪꜰʏ <ʟɪɴᴋ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ꜱᴘᴏᴛɪꜰʏ https://open.spotify.com/track/...\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        const url = args[0];

        if (!url.includes('spotify.com')) {
            return sock.sendMessage(chatId, { 
                text: `❌ ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ꜱᴘᴏᴛɪꜰʏ ʟɪɴᴋ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ꜱᴘᴏᴛɪꜰʏ ꜱᴏɴɢ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const apiUrl = `https://api-rebix.zone.id/api/spotifydl?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);
            const result = response.data.result || response.data.data || response.data;

            // API එකෙන් එන ලින්ක් එක හොයාගන්නවා
            const downloadUrl = result.download_url || result.audio || result.url || result.link;
            const title = result.title || result.name || 'ꜱᴘᴏᴛɪꜰʏ ꜱᴏɴɢ';
            const artist = result.artist || result.artists || 'ᴜɴᴋɴᴏᴡɴ ᴀʀᴛɪꜱᴛ';

            if (!downloadUrl) {
                throw new Error('ᴄᴏᴜʟᴅ ɴᴏᴛ ꜰɪɴᴅ ᴅᴏᴡɴʟᴏᴀᴅ ᴜʀʟ ɪɴ ᴀᴘɪ ʀᴇꜱᴘᴏɴꜱᴇ');
            }

            const audioResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(audioResponse.data);
            
            const caption = `🎧 *ꜱᴘᴏᴛɪꜰʏ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
                            `🎵 *ᴛɪᴛʟᴇ:* ${title}\n` +
                            `👤 *ᴀʀᴛɪꜱᴛ:* ${artist}\n\n` +
                            `> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                fileName: `${title.replace(/[\\/:*?"<>|]/g, "")}.mp3`,
                caption: caption,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('Spotify Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ᴇʀʀᴏʀ: ${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};