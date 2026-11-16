const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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

/* Personal accounts walata interactive message render wenna me node eka ona */
const BIZ_NODE = {
    tag: 'biz',
    attrs: {},
    content: [{
        tag: 'interactive',
        attrs: { type: 'native_flow', v: '1' },
        content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
    }]
};

module.exports = {
    name: 'ocr',
    description: 'Extract text from an image',
    category: 'tools',
    alias: ['readtext'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🔍', key: msg.key } }); } catch (e) {}

        // Quoted message eka ganna
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMessage) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('ocr')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🖼️ *ʀᴇᴘʟʏ* ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ\n│ 🔗 *ᴏʀ ᴛʏᴘᴇ:* ${prefix}ᴏᴄʀ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        if (!quotedMessage.imageMessage) {
            return sock.sendMessage(chatId, { 
                text: `❌ ᴘʟᴇᴀꜱᴇ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ!\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        if (!process.env.OCR_API_KEY) {
            return sock.sendMessage(chatId, { 
                text: `❌ ᴏᴄʀ ᴀᴘɪ ᴋᴇʏ ɪꜱ ɴᴏᴛ ᴄᴏɴꜰɪɢᴜʀᴇᴅ ɪɴ .ᴇɴᴠ ꜰɪʟᴇ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ᴇxᴛʀᴀᴄᴛɪɴɢ ᴛᴇxᴛ ꜰʀᴏᴍ ɪᴍᴀɢᴇ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const buffer = await sock.downloadMediaMessage({ message: quotedMessage });

            if (!buffer) throw new Error('Failed to download image');

            const form = new FormData();
            form.append('apikey', process.env.OCR_API_KEY);
            form.append('language', 'eng');
            form.append('isOverlayRequired', 'false');
            form.append('file', buffer, {
                filename: 'image.jpg',
                contentType: 'image/jpeg',
            });

            const res = await axios.post(
                'https://api.ocr.space/parse/image',
                form,
                {
                    headers: form.getHeaders(),
                    maxBodyLength: Infinity,
                }
            );

            if (res.data.OCRExitCode !== 1) {
                throw new Error('ᴏᴄʀ ꜰᴀɪʟᴇᴅ ᴛᴏ ᴘᴀʀꜱᴇ ɪᴍᴀɢᴇ');
            }

            const extractedText = res.data.ParsedResults?.[0]?.ParsedText?.trim();
            if (!extractedText) {
                throw new Error('ɴᴏ ᴛᴇxᴛ ᴅᴇᴛᴇᴄᴛᴇᴅ ɪɴ ᴛʜᴇ ɪᴍᴀɢᴇ');
            }

            // WhatsApp eken limit wenawa nisa text eka kapa denawa (3500 characters)
            const safeText = extractedText.slice(0, 3500);

            const bodyText = `┌─ム ${getTitle('ocr')}\n\n` +
                `📝 *ᴇxᴛʀᴀᴄᴛᴇᴅ ᴛᴇxᴛ:*\n\n${safeText}`;

            try {
                // Interactive Button eka hadanawa (Copy Text)
                const content = generateWAMessageFromContent(
                    chatId,
                    {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                interactiveMessage: {
                                    contextInfo: forwardContext(), // 👈 Forwarded context eka
                                    body: { text: bodyText },
                                    footer: { text: config.BOT_FOOTER },
                                    nativeFlowMessage: {
                                        buttons: [{
                                            name: 'cta_copy',
                                            buttonParamsJson: JSON.stringify({
                                                display_text: '📋 ᴄᴏᴘʏ ᴛᴇxᴛ',
                                                copy_code: safeText
                                            })
                                        }]
                                    }
                                }
                            }
                        }
                    },
                    { userJid: sock.user.id }
                );

                await sock.relayMessage(chatId, content.message, {
                    messageId: content.key.id,
                    additionalNodes: [BIZ_NODE]
                });

            } catch (err) {
                // Interactive fail unoth normal text ekak widihata yawanawa
                console.log('Interactive OCR failed, sending text fallback');
                await sock.sendMessage(chatId, { 
                    text: `${bodyText}\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

        } catch (err) {
            console.error('OCR Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ᴘʀᴏᴄᴇꜱꜱ ᴏᴄʀ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};