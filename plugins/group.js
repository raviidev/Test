const config = require('../config');

/* Small caps helper */
const SC = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
    n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
const sc = (str) => String(str).toLowerCase().replace(/[a-z]/g, (ch) => SC[ch] || ch);
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

/* Main config owner ට check කරන්න */
const jidNum = (j) => {
    if (!j) return '';
    const raw = String(j).split('@')[0].split(':')[0];
    return raw.replace(/[^0-9]/g, '');
};
const isOwnerMsg = (msg) => {
    if (!msg || !msg.key) return false;
    const ownerNum = config.OWNER_NUMBER || '94720689634'; // config එකේ තියෙන owner number එක
    return [msg.key.remoteJid, msg.key.participant, msg.key.remoteJidAlt, msg.key.participantAlt]
        .some(j => j && jidNum(j) === ownerNum);
};

// Settings toggle karanna simple memory map ekak (Bot restart unoth reset wei)
const groupSettings = new Map();

module.exports = {
    name: 'group',
    description: 'Group management commands',
    category: 'group',
    alias: [
        'tagall', 'tagall1', 'tagme', 'hidetag', 
        'ginfo', 'link', 'mute', 'unmute', 
        'welcome', 'antilink', 'antigst'
    ],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        
        // Command eka hoyagannawa (e.g., .tagall -> tagall)
        const invokedCmd = (text || '').trim().split(' ')[0].replace(prefix, '').toLowerCase();

        // Group ekakda balanawa
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { 
                text: `❌ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ɪꜱ ꜰᴏʀ ɢʀᴏᴜᴘꜱ ᴏɴʟʏ.\n\n> ${config.BOT_FOOTER}`, 
                contextInfo: forwardContext() 
            }, { quoted: msg });
        }

        // Owner Check (Main Owner හෝ Bot Owner)
        const isMainOwner = isOwnerMsg(msg);
        const isOwner = ctx.isOwner || isMainOwner;

        try { await sock.sendMessage(chatId, { react: { text: '⚙️', key: msg.key } }); } catch (e) {}

        try {
            /* ---------------- TAG COMMANDS ---------------- */
            if (['tagall', 'tagall1', 'hidetag', 'tagme'].includes(invokedCmd)) {
                
                // Tagall / Tagall1 / Hidetag Owner ට විතරයි
                if (['tagall', 'tagall1', 'hidetag'].includes(invokedCmd) && !isOwner) {
                    return sock.sendMessage(chatId, { 
                        text: `❌ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ɪꜱ ꜰᴏʀ ᴛʜᴇ ᴏᴡɴᴇʀ ᴏɴʟʏ.\n\n> ${config.BOT_FOOTER}`, 
                        contextInfo: forwardContext() 
                    }, { quoted: msg });
                }

                const metadata = await sock.groupMetadata(chatId);
                const participants = metadata.participants.map(p => p.id);
                const sender = msg.key.participant || msg.key.remoteJid;
                const messageText = args.join(' ') || 'ɴᴏ ᴍᴇꜱꜱᴀɢᴇ';

                if (invokedCmd === 'tagme') {
                    return await sock.sendMessage(chatId, { 
                        text: `┌─ム ${getTitle('tagme')}\n\n👋 ʜᴇʏ @${sender.split('@')[0]}\n\n> ${config.BOT_FOOTER}`,
                        mentions: [sender],
                        contextInfo: forwardContext()
                    }, { quoted: msg });
                }

                if (invokedCmd === 'hidetag') {
                    return await sock.sendMessage(chatId, {
                        text: `┌─ム ${getTitle('hidetag')}\n\n${messageText}\n\n> ${config.BOT_FOOTER}`,
                        mentions: participants,
                        contextInfo: forwardContext()
                    }, { quoted: msg });
                }

                if (invokedCmd === 'tagall1') {
                    let tagText = `┌─ム ${getTitle('tagall')}\n\n📢 *ᴍᴇꜱꜱᴀɢᴇ:* ${messageText}\n\n╭─〔 *ᴍᴇᴍʙᴇʀꜱ* 〕─┈⊷\n`;
                    participants.forEach(p => {
                        tagText += `│ ㋡ @${p.split('@')[0]}\n`;
                    });
                    tagText += `╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`;

                    return await sock.sendMessage(chatId, {
                        text: tagText,
                        mentions: participants,
                        contextInfo: forwardContext()
                    }, { quoted: msg });
                }

                // Default tagall
                let tagText = `┌─ム ${getTitle('tagall')}\n\n📢 *ᴍᴇꜱꜱᴀɢᴇ:* ${messageText}\n\n`;
                participants.forEach(p => { tagText += `@${p.split('@')[0]} `; });
                tagText += `\n\n> ${config.BOT_FOOTER}`;

                return await sock.sendMessage(chatId, {
                    text: tagText,
                    mentions: participants,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

            /* ---------------- INFO & LINK ---------------- */
            if (invokedCmd === 'ginfo') {
                const metadata = await sock.groupMetadata(chatId);
                const info = `┌─ム ${getTitle('ginfo')}\n\n` +
                    `╭─〔 *ɢʀᴏᴜᴘ ɪɴꜰᴏ* 〕─┈⊷\n` +
                    `│ 📛 *ɴᴀᴍᴇ:* ${metadata.subject}\n` +
                    `│ 🆔 *ɪᴅ:* ${metadata.id}\n` +
                    `│ 👥 *ᴍᴇᴍʙᴇʀꜱ:* ${metadata.participants.length}\n` +
                    `│ 👑 *ᴏᴡɴᴇʀ:* @${metadata.owner?.split('@')[0] || 'Unknown'}\n` +
                    `│ 📅 *ᴄʀᴇᴀᴛᴇᴅ:* ${new Date(metadata.creation * 1000).toLocaleDateString()}\n` +
                    `╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`;
                
                return await sock.sendMessage(chatId, { 
                    text: info, 
                    mentions: metadata.owner ? [metadata.owner] : [],
                    contextInfo: forwardContext() 
                }, { quoted: msg });
            }

            if (invokedCmd === 'link') {
                // Link command එක Owner ට විතරයි
                if (!isOwner) {
                    return sock.sendMessage(chatId, { 
                        text: `❌ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ɪꜱ ꜰᴏʀ ᴛʜᴇ ᴏᴡɴᴇʀ ᴏɴʟʏ.\n\n> ${config.BOT_FOOTER}`, 
                        contextInfo: forwardContext() 
                    }, { quoted: msg });
                }

                const code = await sock.groupInviteCode(chatId);
                return await sock.sendMessage(chatId, { 
                    text: `┌─ム ${getTitle('link')}\n\n🔗 *ɢʀᴏᴜᴘ ʟɪɴᴋ:*\nhttps://chat.whatsapp.com/${code}\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

            /* ---------------- OPEN / CLOSE GROUP ---------------- */
            if (['mute', 'group', 'unmute'].includes(invokedCmd)) {
                // Group open/close කරන්න බොට් ට admin තිබිය යුතුයි + Owner ට විතරයි
                if (!isOwner) {
                    return sock.sendMessage(chatId, { 
                        text: `❌ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ɪꜱ ꜰᴏʀ ᴛʜᴇ ᴏᴡɴᴇʀ ᴏɴʟʏ.\n\n> ${config.BOT_FOOTER}`, 
                        contextInfo: forwardContext() 
                    }, { quoted: msg });
                }

                const isClose = invokedCmd === 'mute' || (invokedCmd === 'group' && args[0]?.toLowerCase() === 'close');
                const isOpen = invokedCmd === 'unmute' || (invokedCmd === 'group' && args[0]?.toLowerCase() === 'open');

                if (!isClose && !isOpen) {
                    return await sock.sendMessage(chatId, { 
                        text: `┌─ム ${getTitle('group')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔒 *ᴄʟᴏꜱᴇ:* ${prefix}ɢʀᴏᴜᴘ ᴄʟᴏꜱᴇ\n│ 🔓 *ᴏᴘᴇɴ:* ${prefix}ɢʀᴏᴜᴘ ᴏᴘᴇɴ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                        contextInfo: forwardContext()
                    }, { quoted: msg });
                }

                await sock.groupSettingUpdate(chatId, isClose ? 'announcement' : 'not_announcement');
                return await sock.sendMessage(chatId, { 
                    text: `┌─ム ${getTitle(invokedCmd)}\n\n${isClose ? '🔇 ɢʀᴏᴜᴘ ʜᴀꜱ ʙᴇᴇɴ ᴄʟᴏꜱᴇᴅ (ᴏɴʟʏ ᴀᴅᴍɪɴꜱ).' : '🔊 ɢʀᴏᴜᴘ ʜᴀꜱ ʙᴇᴇɴ ᴏᴘᴇɴᴇᴅ (ᴀʟʟ ᴍᴇᴍʙᴇʀꜱ).'}\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

            /* ---------------- SETTINGS (welcome, antilink, antigst) ---------------- */
            if (['welcome', 'antilink', 'antigst'].includes(invokedCmd)) {
                // Group settings වෙනස් කරන්න බොට් ට admin තිබිය යුතුයි + Owner ට විතරයි
                if (!isOwner) {
                    return sock.sendMessage(chatId, { 
                        text: `❌ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ɪꜱ ꜰᴏʀ ᴛʜᴇ ᴏᴡɴᴇʀ ᴏɴʟʏ.\n\n> ${config.BOT_FOOTER}`, 
                        contextInfo: forwardContext() 
                    }, { quoted: msg });
                }

                const status = args[0]?.toLowerCase();
                if (status !== 'on' && status !== 'off') {
                    return await sock.sendMessage(chatId, { 
                        text: `┌─ム ${getTitle(invokedCmd)}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ ⚙️ *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}${invokedCmd} <ᴏɴ/ᴏꜰꜰ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}${invokedCmd} ᴏɴ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                        contextInfo: forwardContext()
                    }, { quoted: msg });
                }

                // Settings eka save karanawa (Memory eke witharai)
                if (!groupSettings.has(chatId)) groupSettings.set(chatId, {});
                const settings = groupSettings.get(chatId);
                settings[invokedCmd] = status === 'on';

                return await sock.sendMessage(chatId, { 
                    text: `┌─ム ${getTitle(invokedCmd)}\n\n✅ *${invokedCmd.toUpperCase()}* ʜᴀꜱ ʙᴇᴇɴ ᴛᴜʀɴᴇᴅ *${status.toUpperCase()}* ꜰᴏʀ ᴛʜɪꜱ ɢʀᴏᴜᴘ.\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

        } catch (err) {
            console.error('Group Cmd Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ᴇxᴇᴄᴜᴛᴇ ᴄᴏᴍᴍᴀɴᴅ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`, 
                contextInfo: forwardContext() 
            }, { quoted: msg });
        }
    }
};