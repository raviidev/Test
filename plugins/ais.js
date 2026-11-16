const axios = require('axios');
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
    name: 'ai-search',
    description: 'AI-powered search using Copilot',
    category: 'ai',
    alias: ['ais', 'searchai'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        
        try { await sock.sendMessage(chatId, { react: { text: '🤖', key: msg.key } }); } catch (e) {}

        const owners = [
            '94720689634@lid',
            '94720689634@s.whatsapp.net'
        ];
        
        // Baileys wala participant ganne mehemai
        const sender = msg.key.participant || msg.key.remoteJid;
        const isOwner = owners.includes(sender);

        if (!args[0]) {
            return sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('ai-search')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🔍 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴀɪ-ꜱᴇᴀʀᴄʜ <ǫᴜᴇʀʏ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴀɪ-ꜱᴇᴀʀᴄʜ ᴡʜᴀᴛ ɪꜱ ɴᴏᴅᴇ.ᴊꜱ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        const userQuery = args.join(' ');

        const instruction = `
You are an AI search assistant.
Respond like a confident, efficient search engine.

User role: ${isOwner ? 'OWNER' : 'REGULAR USER'}

STRICT RULES (MANDATORY):
- Answer the question directly
- Use markdown formatting
- Be concise and informative
- DO NOT ask follow-up questions
- DO NOT suggest additional help
- DO NOT offer summaries, comparisons, or next steps
- DO NOT say phrases like:
  "If you want, I can..."
  "I can also..."
  "Let me know if you'd like..."
  "Would you like me to..."
- End the response immediately after the answer
- Never mention being an AI
- If facts are uncertain, say: "Information may vary"
`;

        const finalPrompt = `${instruction}\n\nSearch query: ${userQuery}`;

        await sock.sendMessage(chatId, { 
            text: `⏳ ꜱᴇᴀʀᴄʜɪɴɢ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const url = `https://capilotapi.vercel.app/?q=${encodeURIComponent(finalPrompt)}`;
            const res = await axios.get(url);

            let answer = res.data?.response || '';

            // Blocked phrases ain karanawa
            const blockedPhrases = [
                'if you want',
                'i can also',
                'let me know if',
                'would you like me'
            ];

            blockedPhrases.forEach(p => {
                const regex = new RegExp(p + '.*$', 'i');
                answer = answer.replace(regex, '').trim();
            });

            if (!answer) {
                throw new Error('ɴᴏ ʀᴇꜱᴘᴏɴꜱᴇ ꜰʀᴏᴍ ᴀɪ ꜱᴇᴀʀᴄʜ');
            }

            // WhatsApp limit ekata kapenawa
            const safeAnswer = answer.slice(0, 3500);

            const resultText = `┌─ム ${getTitle('ai-search')}\n\n` +
                `╭─〔 *ꜱᴇᴀʀᴄʜ ʀᴇꜱᴜʟᴛ* 〕─┈⊷\n` +
                `│ 🔍 *ǫᴜᴇʀʏ:* ${userQuery}\n` +
                `│\n` +
                `│ 🤖 *ᴀɴꜱᴡᴇʀ:*\n` +
                `│ ${safeAnswer}\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, { 
                text: resultText,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('AI Search Error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ᴀɪ ꜱᴇᴀʀᴄʜ ꜰᴀɪʟᴇᴅ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};