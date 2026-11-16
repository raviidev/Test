const config = require('../config');
const fetch = require('node-fetch');

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
    name: 'tts',
    description: 'Convert text to speech using Jane voice',
    category: 'tools',
    alias: ['say', 'voice'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🗣️', key: msg.key } }); } catch (e) {}

        // Text eka ganna (args walin)
        const ttsText = args.join(' ').trim();

        if (!ttsText) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('tts')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🗣️ *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴛᴛꜱ <ᴛᴇxᴛ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴛᴛꜱ ʜᴇʟʟᴏ ʜᴏᴡ ᴀʀᴇ ʏᴏᴜ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { 
                text: `⏳ ɢᴇɴᴇʀᴀᴛɪɴɢ ꜱᴘᴇᴇᴄʜ...\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });

            // API eken audio eka gannawa (Jane voice)
            const response = await fetch(
                `https://ab-text-voice.abrahamdw882.workers.dev/?q=${encodeURIComponent(ttsText)}&voicename=jane`
            );
            const data = await response.json();
            const audioUrl = data.url;

            if (!audioUrl) {
                throw new Error('API returned no audio URL');
            }

            // Audio eka yawanawa (Forwarded context ekath ekka)
            await sock.sendMessage(chatId, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: 'TTS.mp3',
                contextInfo: forwardContext() // 👈 Context eka methana dammah
            }, { quoted: msg });

        } catch (err) {
            console.error('TTS plugin error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ᴛᴛꜱ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};