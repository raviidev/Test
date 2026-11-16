const { cmd } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "alive",
    alias: ["online", "bot"],
    desc: "Check if the bot is online and active",
    react: "⚡",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
    const uptime = runtime(process.uptime());
    const ramUsed = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });

    const aliveMsg = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  ⚡ *${config.BOT_NAME}*  ┃
╰━━━━━━━━━━━━━━━━━━━━━╯

👋 *Hello ${pushname}!*
_I am online and ready to serve you._ 🚀

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ 👑 *Owner  :*  \`${config.OWNER_NAME}\`
┃ ⏳ *Uptime :*  \`${uptime || 'Just started'}\`
┃ 💾 *RAM    :*  \`${ramUsed} MB\`
┃ 📌 *Prefix :*  \`${config.PREFIX}\`
┃ 🛡️ *Mode   :*  \`${config.MODE.toUpperCase()}\`
┃ ⏰ *Time   :*  \`${currentTime}\`
┗━━━━━━━━━━━━━━━━━━━━━┛

💡 _Type *${config.PREFIX}ping* to check response speed!_

> ${config.BOT_FOOTER}`;

    if (config.ALIVE_IMG && config.ALIVE_IMG.startsWith('http')) {
        await conn.sendMessage(from, { image: { url: config.ALIVE_IMG }, caption: aliveMsg }, { quoted: mek });
    } else {
        await conn.sendMessage(from, { text: aliveMsg }, { quoted: mek });
    }
});
