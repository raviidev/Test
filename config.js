// config.js
module.exports = {
    FIREBASE_URL: process.env.FIREBASE_URL || 'https://queen-hiru-default-rtdb.asia-southeast1.firebasedatabase.app/',
    FIREBASE_SECRET: process.env.FIREBASE_SECRET || '',
    BOT_NAME: 'ǫᴜᴇᴇɴ ʜɪʀᴜ ᴍᴅ </>',
    BOT_FOOTER: '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ǫᴜᴇᴇɴ ʜɪʀᴜ </>',
    PREFIX: '.',
    MAX_RETRIES: 3,
    GROUP_INVITE_LINK: 'https://chat.whatsapp.com/KOLvDIS9Btl7VK5E2dc03H?s=cl&p=a&iam=2',
    RCD_IMAGE_PATH: 'https://file.dnuz.top/ypklg1.jpg', // bot logo
    OTP_EXPIRY: 300000,
    OWNER_NUMBER: process.env.OWNER_NUMBER || '94720689634',
    OCR_API_KEY: process.env.OCR_API_KEY || '',
    OMDB_API_KEY: process.env.OMDB_API_KEY || '',

    // ---- Dashboard eken maru karanna puluwan settings (default values) ----
    mode: 'public', // 'public' = inbox + group hamotama wada | 'private' = owner witarai
    AUTO_STATUS_SEEN: false,
    AUTO_STATUS_REACT: false,
    STATUS_EMOJIS: '💚,❤️,🔥,😍,👏,😎',
    AUTO_READ: false,
    ALWAYS_ONLINE: true,
    AUTO_TYPING: false,
    ANTI_DELETE: true,
    ANTI_EDIT: true,
    FORWARD_TAG: true,   // bot ge msgs channel ekak eken forward una wage pennanawa
    NEWSLETTER_JID: '120363430608120117@newsletter',
    ANTI_DEST: 'owner' // 'owner' = bot number eke own chat eka | 'chat' = delete/edit una chat eka
};
