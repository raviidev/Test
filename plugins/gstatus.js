const config = require('../config');

const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

/* Small caps helper */
const SC = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
    n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
const sc = (str) => String(str).toLowerCase().replace(/[a-z]/g, (ch) => SC[ch]);

// 🟢 Dynamic Title Generator
const getTitle = (cmd) => `${sc(config.BOT_NAME)}  ${sc(cmd)}`;

// 🟢 Forward context builder
function forwardContext() {
    const contextInfo = { forwardingScore: 999, isForwarded: true };
    if (config.NEWSLETTER_ID) {
        contextInfo.forwardedNewsletterMessageInfo = {
            newsletterJid: config.NEWSLETTER_ID,
            newsletterName: config.BOT_NAME,
            serverMessageId: 1
        };
    }
    return contextInfo;
}

module.exports = {
    name: 'groupstatus',
    description: 'Send group status silently',
    category: 'group',
    alias: ['gstatus', 'gs'],
    command: /^\.?(groupstatus|gstatus|gs)$/i,

    async execute(sock, m, args, text, ctx = {}) {
        try {
            const normalize = jid => jid?.split(':')[0];
            const prefix = ctx.prefix || config.PREFIX || '.';

            const sender = normalize(m.sender);
            const botId = normalize(sock.user.id);
            const owners = (global.owners || []).map(normalize);

            const isOwner = owners.includes(sender) || sender === botId;
            if (!isOwner) return;

            const COLORS = {
                green: 0xFF25D366,
                red: 0xFFFF0000,
                blue: 0xFF0000FF,
                yellow: 0xFFFFFF00,
                purple: 0xFF800080,
                black: 0xFF000000,
                white: 0xFFFFFFFF,
                orange: 0xFFFFA500
            };

            let groupId;
            let messageText;
            let chosenColor = COLORS.green;
            let quoted = m.quoted;

            if (!m.isGroup) {
                if (quoted) {
                    if (args.length < 1) {
                        const infoText = [
                            '╭─〔 *ɢʀᴏᴜᴘ ꜱᴛᴀᴛᴜꜱ* 〕─┈⊷',
                            `│ 🔣 *ᴘʀᴇꜰɪx:* ${prefix}`,
                            `│ 📌 *ᴜꜱᴀɢᴇ:* ${prefix}gstatus <groupjid>`,
                            `│ 🧪 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}gstatus 123456789-123456@g.us`,
                            '╰─────────────┈⊷'
                        ].join('\n');
                        const caption = `┌─ム ${getTitle('groupstatus')}\n\n${infoText}\n\n> ${config.BOT_FOOTER}`;
                        await sock.sendMessage(m.from, { text: caption, contextInfo: forwardContext() });
                        return;
                    }
                    groupId = args[0];
                } else {
                    if (args.length < 1) {
                        const infoText = [
                            '╭─〔 *ɢʀᴏᴜᴘ ꜱᴛᴀᴛᴜꜱ* 〕─┈⊷',
                            `│ 🔣 *ᴘʀᴇꜰɪx:* ${prefix}`,
                            `│ 📌 *ᴜꜱᴀɢᴇ:* ${prefix}gstatus <groupjid>,<text>,<color>`,
                            `│ 🧪 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}gstatus 123456789-123456@g.us,Hello group!,blue`,
                            '╰─────────────┈⊷'
                        ].join('\n');
                        const caption = `┌─ム ${getTitle('groupstatus')}\n\n${infoText}\n\n> ${config.BOT_FOOTER}`;
                        await sock.sendMessage(m.from, { text: caption, contextInfo: forwardContext() });
                        return;
                    }

                    const fullText = args.join(' ');
                    const parts = fullText.split(',').map(part => part.trim());

                    if (parts.length < 2) {
                        const caption = `┌─ム ${getTitle('groupstatus')}\n\n> ${config.BOT_FOOTER}`;
                        await sock.sendMessage(m.from, {
                            text: `╭─〔 *ᴇʀʀᴏʀ* 〕─┈⊷\n│ ⚠️ ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ɢʀᴏᴜᴘ ᴊɪᴅ ᴀɴᴅ ᴛᴇxᴛ\n╰─────────────┈⊷\n\n${caption}`,
                            contextInfo: forwardContext()
                        });
                        return;
                    }

                    groupId = parts[0];
                    messageText = parts[1];

                    if (parts.length >= 3) {
                        const possibleColor = parts[2].toLowerCase();
                        if (COLORS[possibleColor]) {
                            chosenColor = COLORS[possibleColor];
                        }
                    }
                }
            } else {
                groupId = m.from;
                quoted = m.quoted;
            }

            let innerMessage;

            if (quoted) {
                if (quoted.message?.imageMessage) {
                    const buffer = await quoted.download();
                    const media = await prepareWAMessageMedia(
                        { image: buffer, caption: quoted.message.imageMessage.caption || '' },
                        { upload: sock.waUploadToServer }
                    );
                    innerMessage = { imageMessage: media.imageMessage };
                } else if (quoted.message?.videoMessage) {
                    const buffer = await quoted.download();
                    const media = await prepareWAMessageMedia(
                        { video: buffer, caption: quoted.message.videoMessage.caption || '' },
                        { upload: sock.waUploadToServer }
                    );
                    innerMessage = { videoMessage: media.videoMessage };
                } else if (quoted.message?.audioMessage) {
                    const buffer = await quoted.download();
                    const media = await prepareWAMessageMedia(
                        {
                            audio: buffer,
                            mimetype: quoted.message.audioMessage.mimetype || 'audio/mp4',
                            ptt: quoted.message.audioMessage.ptt || false
                        },
                        { upload: sock.waUploadToServer }
                    );
                    innerMessage = { audioMessage: media.audioMessage };
                } else {
                    if (!m.isGroup) {
                        const infoText = [
                            '╭─〔 *ᴜɴꜱᴜᴘᴘᴏʀᴛᴇᴅ* 〕─┈⊷',
                            '│ ⚠️ Qᴜᴏᴛᴇ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ ᴏʀ ᴀᴜᴅɪᴏ',
                            '╰─────────────┈⊷'
                        ].join('\n');
                        const caption = `┌─ム ${getTitle('groupstatus')}\n\n${infoText}\n\n> ${config.BOT_FOOTER}`;
                        await sock.sendMessage(m.from, { text: caption, contextInfo: forwardContext() });
                    }
                    return;
                }
            } else {
                if (!messageText) {
                    if (!m.isGroup) {
                        const caption = `┌─ム ${getTitle('groupstatus')}\n\n> ${config.BOT_FOOTER}`;
                        await sock.sendMessage(m.from, {
                            text: `╭─〔 *ᴇʀʀᴏʀ* 〕─┈⊷\n│ ⚠️ ɴᴏ ᴍᴇꜱꜱᴀɢᴇ ᴛᴇxᴛ ᴘʀᴏᴠɪᴅᴇᴅ\n╰─────────────┈⊷\n\n${caption}`,
                            contextInfo: forwardContext()
                        });
                    }
                    return;
                }

                innerMessage = {
                    extendedTextMessage: {
                        text: messageText,
                        backgroundArgb: chosenColor,
                        font: 1
                    }
                };
            }

            const content = {
                groupStatusMessageV2: { message: innerMessage }
            };

            const msg = generateWAMessageFromContent(
                groupId,
                proto.Message.fromObject(content),
                { userJid: sock.user.id }
            );

            await sock.relayMessage(groupId, msg.message, { messageId: msg.key.id });

            if (!m.isGroup) {
                const infoText = [
                    '╭─〔 *ꜱᴜᴄᴄᴇꜱꜱ* 〕─┈⊷',
                    '│ ✅ ɢʀᴏᴜᴘ ꜱᴛᴀᴛᴜꜱ ꜱᴇɴᴛ',
                    '╰─────────────┈⊷'
                ].join('\n');
                const caption = `┌─ム ${getTitle('groupstatus')}\n\n${infoText}\n\n> ${config.BOT_FOOTER}`;
                await sock.sendMessage(m.from, { text: caption, contextInfo: forwardContext() });
            }

        } catch (err) {
            console.error('GroupStatus Error:', err);
            if (!m.isGroup) {
                const caption = `┌─ム ${getTitle('groupstatus')}\n\n> ${config.BOT_FOOTER}`;
                await sock.sendMessage(m.from, {
                    text: `╭─〔 *ᴇʀʀᴏʀ* 〕─┈⊷\n│ ❌ ${err.message}\n╰─────────────┈⊷\n\n${caption}`,
                    contextInfo: forwardContext()
                }).catch(() => {});
            }
        }
    }
};