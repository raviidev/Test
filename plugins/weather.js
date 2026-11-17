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
    name: 'weather',
    description: 'Get weather information for a location',
    category: 'search',
    alias: ['weatherinfo', 'temp'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '🌤', key: msg.key } }); } catch (e) {}

        const q = args.join(' ').trim();

        if (!q) {
            return await sock.sendMessage(chatId, { 
                text: `┌─ム ${getTitle('weather')}\n\n╭─〔 *ᴜꜱᴀɢᴇ* 〕─┈⊷\n│ 🌤 *ᴄᴏᴍᴍᴀɴᴅ:* ${prefix}ᴡᴇᴀᴛʜᴇʀ <ᴄɪᴛʏ>\n│ 📌 *ᴇxᴀᴍᴘʟᴇ:* ${prefix}ᴡᴇᴀᴛʜᴇʀ ᴄᴏʟᴏᴍʙᴏ\n╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        try {
            const apiKey = process.env.OPENWEATHER_API_KEY || '';
            if (!apiKey) return await sock.sendMessage(chatId, { text: `❌ Weather is not configured. Add OPENWEATHER_API_KEY to the server environment.\n\n> ${config.BOT_FOOTER}` }, { quoted: msg });
            const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${apiKey}&units=metric`;
            
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const data = response.data;

            const responseText = `┌─ム ${getTitle('weather')}\n\n` +
                `╭─〔 *ᴡᴇᴀᴛʜᴇʀ ɪɴꜰᴏ* 〕─┈⊷\n` +
                `│ 📍 *ʟᴏᴄᴀᴛɪᴏɴ:* ${data.name}, ${data.sys.country}\n` +
                `│\n` +
                `│ 🌡️ *ᴛᴇᴍᴘᴇʀᴀᴛᴜʀᴇ:* ${data.main.temp}°ᴄ\n` +
                `│ 🤔 *ꜰᴇᴇʟꜱ ʟɪᴋᴇ:* ${data.main.feels_like}°ᴄ\n` +
                `│ ❄️ *ᴍɪɴ ᴛᴇᴍᴘ:* ${data.main.temp_min}°ᴄ\n` +
                `│ 🔥 *ᴍᴀx ᴛᴇᴍᴘ:* ${data.main.temp_max}°ᴄ\n` +
                `│ 💧 *ʜᴜᴍɪᴅɪᴛʏ:* ${data.main.humidity}%\n` +
                `│ ⛅ *ᴡᴇᴀᴛʜᴇʀ:* ${data.weather[0].main}\n` +
                `│ 📝 *ᴅᴇꜱᴄʀɪᴘᴛɪᴏɴ:* ${data.weather[0].description}\n` +
                `│ 💨 *ᴡɪɴᴅ ꜱᴘᴇᴇᴅ:* ${data.wind.speed} ᴍ/ꜱ\n` +
                `│ 🌪️ *ᴘʀᴇꜱꜱᴜʀᴇ:* ${data.main.pressure} ʜᴘᴀ\n` +
                `╰─────────────┈⊷\n\n` +
                `> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, { 
                text: responseText,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('❌ Weather plugin error:', err.message);
            
            let errorMsg = '⚠️ API Key Server Down or failed to fetch weather data.';
            if (err.response && err.response.status === 404) {
                errorMsg = '🚫 ᴄɪᴛʏ ɴᴏᴛ ꜰᴏᴜɴᴅ. ᴘʟᴇᴀꜱᴇ ᴄʜᴇᴄᴋ ᴛʜᴇ ꜱᴘᴇʟʟɪɴɢ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.';
            } else if (err.message) {
                errorMsg = err.message;
            }

            await sock.sendMessage(chatId, { 
                text: `❌ *ᴇʀʀᴏʀ:* ${errorMsg}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    },
};
