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
    name: 'style',
    description: 'Fancy text styles',
    category: 'tools',
    alias: ['font', 'textstyle', 'styler'],

    async execute(sock, msg, args, text, ctx = {}) {
        const chatId = msg.key.remoteJid;
        const prefix = ctx.prefix || config.PREFIX || '.';

        try { await sock.sendMessage(chatId, { react: { text: '💫', key: msg.key } }); } catch (e) {}

        const normal = 'abcdefghijklmnopqrstuvwxyz';

        const styles = {
            1: 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ',
            2: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
            3: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
            4: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
            5: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
            6: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
            7: 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᑫʳˢᵗᵘᵛʷˣʸᶻ',
            8: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
            9: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
            10: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
            11: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
            12: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
            13: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
            14: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
            15: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
            16: 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ',
            17: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
            18: 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᑫʳˢᵗᵘᵛʷˣʸᶻ',
            19: 'ₐᵦ𝒸𝒹ₑ𝒻𝓰ₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥ𝓌ₓᵧ𝓏',
            20: 'ąɓƈɗɛʄɠɧıʝƙƖɱŋơ℘զཞʂɬʉ۷ῳჯყʐ'
        };

        const convert = (text, style) => {
            const chars = [...style];
            return [...text].map(char => {
                const index = normal.indexOf(char.toLowerCase());
                return index !== -1 && chars[index] ? chars[index] : char;
            }).join('');
        };

        const q = args.join(' ').trim();

        // 1. Args nathi nam (Preview menu eka)
        if (!q) {
            const preview = Object.entries(styles)
                .map(([num, style]) => `│ ${num}. ${convert('ɴᴏᴍᴏ ᴍᴅ </>', style)}`)
                .join('\n');

            return await sock.sendMessage(chatId, {
                text: `┌─ム ${getTitle('style')}\n\n` +
                      `╭─〔 *ᴛᴇxᴛ ꜱᴛʏʟᴇʀ* 〕─┈⊷\n` +
                      `│ 📌 *ᴇxᴀᴍᴘʟᴇ 1:* ${prefix}ꜱᴛʏʟᴇ 1, ɴᴏᴍᴏ ᴍᴅ\n` +
                      `│ 📌 *ᴇxᴀᴍᴘʟᴇ 2:* ${prefix}ꜱᴛʏʟᴇ ʜɪ (ɢᴇᴛ ᴀʟʟ ꜱᴛʏʟᴇꜱ)\n` +
                      `│\n` +
                      `│ 🎨 *ᴀᴠᴀɪʟᴀʙʟᴇ ꜱᴛʏʟᴇꜱ:*\n` +
                      `${preview}\n` +
                      `╰─────────────┈⊷\n\n` +
                      `> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }

        // 2. Number ekak ekka text ekak dila thiyenawa nam (e.g., .style 1, hi)
        const match = q.match(/^(\d+)[,\s]+(.+)$/);

        if (match) {
            const styleNumber = Number(match[1]);
            const textToStyle = match[2];

            if (!styles[styleNumber]) {
                return await sock.sendMessage(chatId, {
                    text: `❌ ꜱᴛʏʟᴇ ${styleNumber} ɴᴏᴛ ꜰᴏᴜɴᴅ.\nᴄʜᴏᴏꜱᴇ 1-${Object.keys(styles).length}.\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }

            try {
                const styledText = convert(textToStyle, styles[styleNumber]);
                return await sock.sendMessage(chatId, {
                    text: `┌─ム ${getTitle('style')}\n\n${styledText}\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            } catch (err) {
                console.error('Style Error:', err.message);
                return await sock.sendMessage(chatId, {
                    text: `❌ *ᴇʀʀᴏʀ:* ${err.message || 'ꜰᴀɪʟᴇᴅ ᴛᴏ ꜱᴛʏʟᴇ ᴛᴇxᴛ.'}\n\n> ${config.BOT_FOOTER}`,
                    contextInfo: forwardContext()
                }, { quoted: msg });
            }
        }

        // 3. Number ekak nathuwa text ekak witharak dila thiyenawa nam (e.g., .style hi)
        // Ewita hama style ekenma text eka hadala yawanawa.
        try {
            // Message eka dika wædi unoth limit wenna puluwan nisa text eka 30ta kapenawa
            const safeText = q.slice(0, 30);
            
            let allStylesText = `┌─ム ${getTitle('style')}\n\n`;
            allStylesText += `╭─〔 *ᴀʟʟ ꜱᴛʏʟᴇꜱ ꜰᴏʀ:* "${safeText}" 〕─┈⊷\n`;
            
            for (const [num, style] of Object.entries(styles)) {
                const styled = convert(safeText, style);
                allStylesText += `│ ${num}. ${styled}\n`;
            }
            
            allStylesText += `╰─────────────┈⊷\n\n> ${config.BOT_FOOTER}`;

            await sock.sendMessage(chatId, {
                text: allStylesText,
                contextInfo: forwardContext()
            }, { quoted: msg });

        } catch (err) {
            console.error('Style All Error:', err.message);
            await sock.sendMessage(chatId, {
                text: `❌ *ᴇʀʀᴏʀ:* ${err.message || 'ꜰᴀɪʟᴇᴅ ᴛᴏ ꜱᴛʏʟᴇ ᴛᴇxᴛ.'}\n\n> ${config.BOT_FOOTER}`,
                contextInfo: forwardContext()
            }, { quoted: msg });
        }
    }
};