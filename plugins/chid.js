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
    name: 'chid',
    description: 'Get chat / channel ID',
    category: 'tools',
    alias: ['chatid', 'id'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        const isGroup = chatId.endsWith('@g.us');

        try { await sock.sendMessage(chatId, { react: { text: '🆔', key: msg.key } }); } catch (e) {}

        // දැනට ඉන්න චැට් එකේ සහ යූසර්ගේ ID එක ගන්නවා
        const senderId = isGroup ? (msg.key.participant || 'Unknown') : chatId;
        
        // Quoted message එකේ context එක බලනවා (Channel ID එකක් තියෙනවද කියලා)
        const quotedContext = msg.message?.extendedTextMessage?.contextInfo;
        const forwardedChannel = quotedContext?.forwardedNewsletterMessageInfo;
        
        // Channel ID එක (තියෙනවා නම්)
        const channelId = forwardedChannel?.newsletterJid || 'ɴ/ᴀ (ɴᴏᴛ ꜰʀᴏᴍ ᴀ ᴄʜᴀɴɴᴇʟ)';
        const channelName = forwardedChannel?.newsletterName || 'ɴ/ᴀ';

        const infoText = `┌─ム ${getTitle('chid')}\n\n` +
            `╭─〔 *ᴄʜᴀᴛ ɪɴꜰᴏ* 〕─┈⊷\n` +
            `│ 🆔 *ᴄʜᴀᴛ ɪᴅ:* ${chatId}\n` +
            `│ 👤 *ᴜꜱᴇʀ ɪᴅ:* ${senderId}\n` +
            `│ 📢 *ᴄʜᴀɴɴᴇʟ ɪᴅ:* ${channelId}\n` +
            (forwardedChannel ? `│ 📛 *ᴄʜᴀɴɴᴇʟ ɴᴀᴍᴇ:* ${channelName}\n` : '') +
            `╰─────────────┈⊷\n\n` +
            `> ${config.BOT_FOOTER}`;

        await sock.sendMessage(chatId, { 
            text: infoText,
            contextInfo: forwardContext() // 👈 Forwarded context eka
        }, { quoted: msg });
    }
};