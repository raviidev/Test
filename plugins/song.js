const axios = require('axios');
const pix = require('pixcore');
const yts = require('yt-search');
const config = require('../config');

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
    name: 'song',
    description: 'Search YouTube and choose MP3 or MP4 to download',
    category: 'downloaders',
    alias: ['song', 'play'],
    
    // ctx = { number, config, prefix, from, sender, isOwner, type }
    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        const query = args.join(" ").trim();

        try { await sock.sendMessage(chatId, { react: { text: '🎧', key: msg.key } }); } catch (e) {}

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('play')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔗 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴘʟᴀʏ <ꜱᴇᴀʀᴄʜ/ʟɪɴᴋ>\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            let finalUrl = query;
            let title = "YouTube Video";
            let thumbUrl = null;

            if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
                const results = await yts(query);
                if (!results || !results.videos || results.videos.length === 0) {
                    return sock.sendMessage(chatId, { text: "❌ No results found on YouTube.", contextInfo: forwardContext() }, { quoted: msg });
                }
                finalUrl = results.videos[0].url;
                title = results.videos[0].title;
                thumbUrl = results.videos[0].thumbnail;
            } else {
                const results = await yts(query);
                if (results && results.videos && results.videos.length > 0) {
                    title = results.videos[0].title;
                    thumbUrl = results.videos[0].thumbnail;
                }
            }

            let thumb = null;
            try {
                if (thumbUrl) {
                    const { data } = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
                    const img = await pix.read(Buffer.from(data));
                    const resized = await img.resize(120, 120, { fit: 'cover' });
                    thumb = await resized.toBuffer({ format: 'jpeg', quality: 85 });
                }
            } catch (e) { thumb = null; }

            const bodyText = `🎬 *${title}*\n\nᴄʜᴏᴏꜱᴇ ᴀ ꜰᴏʀᴍᴀᴛ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ:`;

            await sock.relayMessage(
                chatId,
                {
                    buttonsMessage: {
                        text: bodyText,
                        contentText: bodyText,
                        footerText: config.BOT_FOOTER,
                        contextInfo: forwardContext(), // 👈 Forwarded context eka
                        locationMessage: {
                            name: title,
                            address: "YouTube Download",
                            jpegThumbnail: thumb
                        },
                        buttons: [
                            {
                                buttonId: `${prefix}ytmp3 ${finalUrl}`,
                                buttonText: { displayText: '🎵 ᴍᴘ3' },
                                type: 1
                            },
                            {
                                buttonId: `${prefix}ytmp4 ${finalUrl}`,
                                buttonText: { displayText: '🎬 ᴍᴘ4' },
                                type: 1
                            }
                        ],
                        headerType: 6
                    }
                },
                {
                    additionalNodes: [
                        {
                            tag: 'biz',
                            attrs: {},
                            content: [
                                {
                                    tag: 'interactive',
                                    attrs: { type: 'native_flow', v: '1' },
                                    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                                }
                            ]
                        }
                    ]
                }
            );

        } catch (err) {
            console.error('Play error:', err);
            sock.sendMessage(chatId, { text: `❌ ᴇʀʀᴏʀ: ${err.message}\n\n> ${config.BOT_FOOTER}`, contextInfo: forwardContext() }, { quoted: msg });
        }
    }
};