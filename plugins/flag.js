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

const games = new Map();
const processedMessages = new Set();

module.exports = {
    name: 'flag',
    description: 'Guess the country from its flag',
    category: 'fun',
    alias: ['guessflag'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';
        const sender = msg.key.participant || msg.key.remoteJid;
        const playerName = msg.pushName || sender.split('@')[0] || 'Player';

        try { await sock.sendMessage(chatId, { react: { text: '🏁', key: msg.key } }); } catch (e) {}

        if (games.has(chatId)) {
            return sock.sendMessage(chatId, { 
                text: `❌ ᴛʜᴇʀᴇ ɪꜱ ᴀʟʀᴇᴀᴅʏ ᴀ ꜰʟᴀɢ ɢᴀᴍᴇ ʀᴜɴɴɪɴɢ ɪɴ ᴛʜɪꜱ ᴄʜᴀᴛ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { 
            text: `⏳ ꜱᴛᴀʀᴛɪɴɢ ɢᴀᴍᴇ...\n\n> ${config.BOT_FOOTER}`,
            contextInfo: forwardContext()
        }, { quoted: msg });

        try {
            const response = await axios.get(
                'https://api-abztech.zone.id/search/countries',
                { timeout: 30000 }
            );

            const countries = response.data?.countries;

            if (!Array.isArray(countries) || !countries.length) {
                throw new Error('ꜰᴀɪʟᴇᴅ ᴛᴏ ʟᴏᴀᴅ ᴄᴏᴜɴᴛʀɪᴇꜱ ꜰʀᴏᴍ ᴀᴘɪ');
            }

            const country = countries[Math.floor(Math.random() * countries.length)];

            const imageResponse = await axios.get(country.img, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            const image = Buffer.from(imageResponse.data);

            const gameCaption = `┌─ム ${getTitle('flag')}\n\n` +
                `╭─〔 *ɢᴜᴇꜱꜱ ᴛʜᴇ ꜰʟᴀɢ* 〕─┈⊷\n` +
                `│ 👤 *ᴘʟᴀʏᴇʀ:* ${playerName}\n` +
                `│\n` +
                `│ 🏁 ʀᴇᴘʟʏ ᴛᴏ ᴛʜɪꜱ ꜰʟᴀɢ\n` +
                `│ ᴡɪᴛʜ ᴛʜᴇ ᴄᴏᴜɴᴛʀʏ ɴᴀᴍᴇ.\n` +
                `│\n` +
                `│ ⏱️ ʏᴏᴜ ʜᴀᴠᴇ 1 ᴍɪɴᴜᴛᴇ.\n` +
                `│ 💡 ᴛʏᴘᴇ ${prefix}ʜɪɴᴛꜰʟᴀɢ ꜰᴏʀ ᴀ ʜɪɴᴛ.\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            const gameMessage = await sock.sendMessage(chatId, {
                image,
                caption: gameCaption,
                contextInfo: forwardContext()
            }, { quoted: msg });

            const timeout = setTimeout(async () => {
                const game = games.get(chatId);
                if (!game) return;
                games.delete(chatId);

                await sock.sendMessage(chatId, {
                    text: `⏰ *ᴛɪᴍᴇ'ꜱ ᴜᴘ, ${game.playerName}!*\n\nᴛʜᴇ ᴄᴏʀʀᴇᴄᴛ ᴀɴꜱᴡᴇʀ ᴡᴀꜱ: *${game.answer}*\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                });
            }, 60000);

            games.set(chatId, {
                answer: country.name,
                sender,
                playerName,
                messageId: gameMessage.key.id,
                hintUsed: false,
                timeout
            });

        } catch (err) {
            console.error('game error:', err.message);
            await sock.sendMessage(chatId, { 
                text: `❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ꜰʟᴀɢ ɢᴀᴍᴇ.\n\n${err.message}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    },

    async onMessage(sock, msg, ctx = {}) {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (!text) return;

        const chatId = msg.key.remoteJid;
        const game = games.get(chatId);
        if (!game) return;

        const messageId = msg.key?.id;
        if (!messageId) return;
        if (processedMessages.has(messageId)) return;
        
        processedMessages.add(messageId);
        setTimeout(() => { processedMessages.delete(messageId); }, 120000);

        const prefix = ctx.prefix || config.PREFIX || '.';
        const sender = msg.key.participant || msg.key.remoteJid;
        const playerName = msg.pushName || sender.split('@')[0] || 'Player';
        const cleanText = text.trim();

        if (sender !== game.sender) return;

        // Hint command check
        if (cleanText.toLowerCase() === `${prefix}hintflag` || cleanText.toLowerCase() === '.hintflag') {
            if (game.hintUsed) return;
            game.hintUsed = true;

            const answer = game.answer;
            await sock.sendMessage(chatId, {
                text: `💡 *ʜɪɴᴛ ꜰᴏʀ ${game.playerName}*\n\n` +
                      `ꜱᴛᴀʀᴛꜱ ᴡɪᴛʜ: *${answer.charAt(0).toUpperCase()}*\n` +
                      `ʟᴇᴛᴛᴇʀꜱ: *${answer.length}*\n\n` +
                      `> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
            return;
        }

        // Quoted message eka check karanawa
        const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        if (quotedId !== game.messageId) return;

        // Answer eka check karanawa
        if (cleanText.toLowerCase() === game.answer.toLowerCase()) {
            clearTimeout(game.timeout);
            games.delete(chatId);

            await sock.sendMessage(chatId, {
                text: `✅ *ᴄᴏʀʀᴇᴄᴛ, ${playerName}!*\n\nᴛʜᴇ ᴀɴꜱᴡᴇʀ ᴡᴀꜱ *${game.answer}*.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
            
            try { await sock.sendMessage(chatId, { react: { text: '🎉', key: msg.key } }); } catch (e) {}
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ *ᴡʀᴏɴɢ ᴀɴꜱᴡᴇʀ, ${playerName}!*\n\nᴛʀʏ ᴀɢᴀɪɴ.\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};
