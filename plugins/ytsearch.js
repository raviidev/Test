const yts = require('yt-search');
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
    name: 'ytsearch',
    description: 'Search for a YouTube video',
    category: 'search',
    alias: ['youtube', 'yts'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🔎', key: msg.key } }); } catch (e) {}

        try {
            if (!args[0]) {
                return sock.sendMessage(chatId, { 
                    text: `┌─ム ${getTitle('ytsearch')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ʏᴛꜱᴇᴀʀᴄʜ <ǫᴜᴇʀʏ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ʏᴛꜱᴇᴀʀᴄʜ ʟᴏ-ꜰɪ ᴍᴜꜱɪᴄ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

            const query = args.join(' ');
            const results = await yts(query);

            if (!results || !results.videos || results.videos.length === 0) {
                return sock.sendMessage(chatId, { text: "❌ No results found on YouTube.", contextInfo: forwardContext() }, { quoted: msg });
            }

            const video = results.videos[0];

            // 1. Image eka yawanawa (Normal - Context nathuwa)
            try {
                await sock.sendMessage(chatId, { image: { url: video.thumbnail } }, { quoted: msg });
            } catch (e) { console.log('YT thumbnail failed'); }

            const replyMessage = `┌─ム ${getTitle('ytsearch')}\n\n` +
                `🎬 *ᴛɪᴛʟᴇ:* ${video.title}\n` +
                `📌 *ʟɪɴᴋ:* ${video.url}\n` +
                `⏱ *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.timestamp}\n` +
                `👁 *ᴠɪᴇᴡꜱ:* ${video.views.toLocaleString()}\n` +
                `📅 *ᴜᴘʟᴏᴀᴅᴇᴅ:* ${video.ago}\n` +
                `🎥 *ᴄʜᴀɴɴᴇʟ:* ${video.author.name}\n\n` +
                `> ${config.BOT_FOOTER}`;

            // 2. Text eka yawanawa (Forwarded Context ekka)
            await sock.sendMessage(chatId, { 
                text: replyMessage,
                contextInfo: forwardContext() 
            }, { quoted: msg });

        } catch (err) {
            console.error('YouTube Search Error:', err);
            sock.sendMessage(chatId, { text: `❌ Failed to search YouTube.\n${err.message}`, contextInfo: forwardContext() }, { quoted: msg });
        }
    }
};