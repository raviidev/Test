const axios = require('axios');
const fetch = require('node-fetch');
const googleTTS = require('google-tts-api');
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

async function getTTSBuffer(text, lang = 'en') {
    try {
        const audioChunks = await googleTTS.getAllAudioBase64(text, {
            lang: lang,
            slow: false,
            timeout: 10000,
            splitPunct: ',.?'
        });
        if (audioChunks && audioChunks.length > 0) {
            return Buffer.concat(audioChunks.map(chunk => Buffer.from(chunk.base64, 'base64')));
        }
    } catch (e) {
        // try direct Google endpoint
    }

    try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=${encodeURIComponent(lang)}&client=tw-ob`;
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (res.data) return Buffer.from(res.data);
    } catch (e) {
        // try worker
    }

    try {
        const ttsResponse = await fetch(
            `https://ab-text-voice.abrahamdw882.workers.dev/?q=${encodeURIComponent(text)}&voicename=jane`
        );
        const ttsData = await ttsResponse.json();
        const audioRes = await axios.get(ttsData.url, {
            responseType: "arraybuffer",
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        return Buffer.from(audioRes.data);
    } catch (e) {
        throw new Error('All TTS generation failed');
    }
}

module.exports = {
    name: 'aivoice',
    description: 'AI voice search with audio response',
    category: 'ai',
    alias: ['aiv', 'voiceai', 'aisv'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🔊', key: msg.key } }); } catch (e) {}

        if (!args[0]) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('aivoice')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🗣️ *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴀɪᴠ <ʏᴏᴜʀ ǫᴜᴇꜱᴛɪᴏɴ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴀɪᴠ ᴡʜᴀᴛ ɪꜱ ᴛʜᴇ ᴄᴀᴘɪᴛᴀʟ ᴏꜰ ꜰʀᴀɴᴄᴇ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ... ᴛʜɪɴᴋɪɴɢ..\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        const userQuery = args.join(" ").trim();
        const sender = msg.key.participant || msg.key.remoteJid; // Baileys sender id

        try {
            if (userQuery.toLowerCase() === 'hi' || userQuery.toLowerCase() === 'hello') {
                const greeting = "Hello! I am your AI voice assistant. How can I help you today?";
                const buffer = await getTTSBuffer(greeting, 'en');

                await sock.sendMessage(chatId, {
                    audio: buffer,
                    mimetype: "audio/mpeg",
                    fileName: "ai_greeting.mp3",
                    ptt: false,
                    contextInfo: {
                        ...forwardContext(), // 👈 Forwarded context eka merge kala
                        externalAdReply: {
                            title: "🎤 ᴀɪ ᴠᴏɪᴄᴇ ʀᴇꜱᴘᴏɴꜱᴇ",
                            body: "ɢʀᴇᴇᴛɪɴɢ ᴍᴇꜱꜱᴀɢᴇ",
                            thumbnailUrl: config.RCD_IMAGE_PATH, // Config eken gannawa
                            mediaType: 1,
                            sourceUrl: "https://wa.me/" + config.OWNER_NUMBER,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                }, { quoted: msg });
                return;
            }

            const owners = [
                '25770239992037@lid',
                '94720689634@s.whatsapp.net',
                '132779283087413@lid'
            ];
            const isOwner = owners.includes(sender);

            const instruction = `
You are an AI voice assistant. Respond conversationally but concisely in 2-3 sentences maximum.
User role: ${isOwner ? 'OWNER' : 'REGULAR USER'}

STRICT RULES:
- Direct and friendly response
- No markdown or special characters
- No follow-up questions
- No suggestions
- End immediately after answering
`;

            const finalPrompt = `${instruction}\n\nUser query: ${userQuery}`;
            const url = `https://capilotapi.vercel.app/?q=${encodeURIComponent(finalPrompt)}`;
            const res = await axios.get(url);
            let answer = res.data?.response || '';

            const blockedPhrases = [
                'if you want',
                'i can also',
                'let me know if',
                'would you like me',
                'as an ai'
            ];

            blockedPhrases.forEach(p => {
                answer = answer.replace(new RegExp(p, 'gi'), '');
            });

            answer = answer.replace(/[*_#`\[\]()]/g, '').trim();

            if (!answer) {
                answer = "ɪ ᴄᴏᴜʟᴅɴ'ᴛ ꜰɪɴᴅ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ ᴀʙᴏᴜᴛ ᴛʜᴀᴛ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɴᴏᴛʜᴇʀ ǫᴜᴇꜱᴛɪᴏɴ.";
            }

            const buffer = await getTTSBuffer(answer, 'en');

            await sock.sendMessage(chatId, {
                audio: buffer,
                mimetype: "audio/mpeg",
                fileName: `AI_Response_${Date.now()}.mp3`,
                ptt: false,
                contextInfo: {
                    ...forwardContext(),
                    externalAdReply: {
                        title: answer.substring(0, 30) + (answer.length > 30 ? '...' : ''),
                        body: `ǫᴜᴇʀʏ: ${userQuery.substring(0, 40)}${userQuery.length > 40 ? '...' : ''}`,
                        thumbnailUrl: config.RCD_IMAGE_PATH,
                        mediaType: 1,
                        sourceUrl: "https://wa.me/" + config.OWNER_NUMBER,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            }, { quoted: msg });

        } catch (err) {
            console.error('AI Voice error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ᴀᴜᴅɪᴏ ʀᴇꜱᴘᴏɴꜱᴇ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};