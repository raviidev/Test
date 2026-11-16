const fs = require('fs');
const acrcloud = require('acrcloud');
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
    name: 'shazam',
    description: 'Identify music from audio/video',
    category: 'tools',
    alias: ['whatmusic', 'quemusica'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        let filePath = null;

        try { await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } }); } catch (e) {}

        // API Config eka
        const acr = new acrcloud({
            host: 'identify-eu-west-1.acrcloud.com',
            access_key: 'c33c767d683f78bd17d4bd4991955d81',
            access_secret: 'bvgaIAEtADBTbLwiPGYlxupWqkNGIjT7J9Ag2vIu'
        });

        // Quoted message eka ganna
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Quoted message ekak nathnam, message eka witharak audio/video da balanawa
        let mediaMessage = quotedMessage;
        let mime = '';

        if (quotedMessage) {
            mime = quotedMessage.audioMessage?.mimetype || quotedMessage.videoMessage?.mimetype || '';
        } else if (msg.message?.audioMessage) {
            mediaMessage = msg.message;
            mime = msg.message.audioMessage.mimetype || '';
        } else if (msg.message?.videoMessage) {
            mediaMessage = msg.message;
            mime = msg.message.videoMessage.mimetype || '';
        }

        if (!mediaMessage || !/audio|video/.test(mime)) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('shazam')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🎵 *ʀᴇᴘʟʏ* ᴛᴏ ᴀɴ ᴀᴜᴅɪᴏ ᴏʀ ᴠɪᴅᴇᴏ\n│ 🔗 *ᴏʀ ᴛʏᴘᴇ:* ${prefix}ꜱʜᴀᴢᴀᴍ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ɪᴅᴇɴᴛɪꜰʏɪɴɢ ᴍᴜꜱɪᴄ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const buffer = await sock.downloadMediaMessage({ message: mediaMessage });
            const ext = mime.split('/')[1] || 'mp3';
            filePath = `./tmp/${Date.now()}.${ext}`;

            if (!fs.existsSync('./tmp')) {
                fs.mkdirSync('./tmp', { recursive: true });
            }

            fs.writeFileSync(filePath, buffer);
            
            const res = await acr.identify(fs.readFileSync(filePath));
            const { code, msg: acrMsg } = res.status;

            if (code !== 0) {
                throw new Error(acrMsg);
            }

            if (!res.metadata || !res.metadata.music || !res.metadata.music[0]) {
                throw new Error('ɴᴏ ᴍᴜꜱɪᴄ ꜰᴏᴜɴᴅ ɪɴ ᴛʜᴇ ᴘʀᴏᴠɪᴅᴇᴅ ᴀᴜᴅɪᴏ/ᴠɪᴅᴇᴏ');
            }

            const { title, artists, album, genres, release_date } = res.metadata.music[0];
            
            const txt = `┌─ム ${getTitle('shazam')}\n\n` +
                        `╭─〔 *ʀᴇꜱᴜʟᴛ* 〕─┈⊷\n` +
                        `│ 🎵 *ᴛɪᴛʟᴇ:* ${title || 'ɴᴏᴛ ꜰᴏᴜɴᴅ'}\n` +
                        `│ 👤 *ᴀʀᴛɪꜱᴛ:* ${artists ? artists.map(v => v.name).join(', ') : 'ɴᴏᴛ ꜰᴏᴜɴᴅ'}\n` +
                        `│ 💿 *ᴀʟʙᴜᴍ:* ${album?.name || 'ɴᴏᴛ ꜰᴏᴜɴᴅ'}\n` +
                        `│ 🎸 *ɢᴇɴʀᴇ:* ${genres ? genres.map(v => v.name).join(', ') : 'ɴᴏᴛ ꜰᴏᴜɴᴅ'}\n` +
                        `│ 📅 *ʀᴇʟᴇᴀꜱᴇ:* ${release_date || 'ɴᴏᴛ ꜰᴏᴜɴᴅ'}\n` +
                        `╰─────────────┈⊷\n\n` +
                        `> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, { 
                text: txt,
                contextInfo: forwardContext() // 👈 Result ekata forwarded context eka
            }, { quoted: msg });

        } catch (err) {
            console.error('Shazam Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ᴇʀʀᴏʀ ɪᴅᴇɴᴛɪꜰʏɪɴɢ ᴍᴜꜱɪᴄ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        } finally {
            // Temp file eka ain karanawa
            if (filePath && fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) {}
            }
        }
    }
};