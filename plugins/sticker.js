const config = require('../config');
const { imageToStickerWithMetadata, videoToStickerWithMetadata } = require('../lib/sticker');
const { downloadMediaMessage } = require('@whiskeysockets/baileys'); // 👈 මේක අලුතෙන් එකතු කළා

/* Small caps helper */
const SC = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
    n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
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
    name: 'sticker',
    description: 'Convert image or video to sticker with metadata',
    category: 'tools',
    alias: ['s', 'stiker'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } }); } catch (e) {}

        // Quoted message eka ganna
        const quotedContext = msg.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = quotedContext?.quotedMessage;
        
        if (!quotedMessage) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('sticker')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🖼️ *ʀᴇᴘʟʏ* ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ ᴏʀ ᴠɪᴅᴇᴏ\n│ 🔗 *ᴏʀ ᴛʏᴘᴇ:* ${prefix}ꜱ <ᴡɪᴛʜ ᴍᴇᴅɪᴀ>\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        const mimeType = (quotedMessage.imageMessage?.mimetype || quotedMessage.videoMessage?.mimetype || "").toLowerCase();
        const isImage = mimeType.includes('image');
        const isVideo = mimeType.includes('video');

        if (!isImage && !isVideo) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
            return sock.sendMessage(chatId, { 
                text: `❌ ᴘʟᴇᴀꜱᴇ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ ᴏʀ ᴠɪᴅᴇᴏ!\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            // 👇 Baileys වල නිවැරදිම ක්‍රමය - Message Object එක හදලා Download කරනවා
            const targetMessage = {
                key: {
                    remoteJid: chatId,
                    id: quotedContext.stanzaId,
                    participant: quotedContext.participant
                },
                message: quotedMessage
            };

            const buffer = await downloadMediaMessage(
                targetMessage,
                'buffer',
                {},
                { logger: console }
            );

            if (!buffer || buffer.length === 0) throw new Error('ꜰᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇᴅɪᴀ');

            let packname = config.BOT_NAME;
            let author = "ᴏᴡɴᴇʀ";
            let categories = ['😀', '🎉'];

            if (args.length > 0) {
                const metaArgs = args.join(" ").split("|");
                if (metaArgs[0] && metaArgs[0].trim()) packname = metaArgs[0].trim();
                if (metaArgs[1] && metaArgs[1].trim()) author = metaArgs[1].trim();
                if (metaArgs[2] && metaArgs[2].trim()) {
                    categories = metaArgs[2].split(",").map(e => e.trim()).filter(e => e);
                }
            }

            let stickerBuffer;
            if (isVideo) {
                stickerBuffer = await videoToStickerWithMetadata(buffer, packname, author, categories);
            } else {
                stickerBuffer = await imageToStickerWithMetadata(buffer, packname, author, categories);
            }

            await sock.sendMessage(chatId, {
                sticker: stickerBuffer,
                contextInfo: forwardContext()
            }, { quoted: msg });

            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error('Sticker Error:', err);
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ᴄʀᴇᴀᴛᴇ ꜱᴛɪᴄᴋᴇʀ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};