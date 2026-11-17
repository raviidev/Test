# Queen Hiru / Nomo Mini — යාවත්කාලීන කළ bot එක

## ස්ථාපනය

1. Node.js 18 හෝ නවතම අනුවාදයක් භාවිතා කරන්න.
2. `.env.example` එක `.env` ලෙස පිටපත් කර ඔබගේ අගයන් දාන්න.
3. `npm ci` ධාවනය කර `npm start` මඟින් සේවාව අරඹන්න.
4. Bot එකේ දුරකථන අංකය pairing page එකෙන් link කරන්න.

## අවශ්‍ය ආරක්ෂක සැකසුම්

- `ADMIN_PASSWORD` එකට ඔබගේම දිග, අද්විතීය රහසක් යොදන්න (අවම අකුරු 12). එය නොමැතිනම් admin panel එක ආරක්ෂාව සඳහා ක්‍රියා විරහිතයි. කලින් source එකේ තිබුණු default password එක නැවත භාවිත නොකරන්න.
- `OWNER_NUMBER` රටේ කේතය සමඟ digits පමණක් යොදන්න.
- Bot session keys Firebase Realtime Database එකේ ගබඩා වේ. Firebase rules මඟින් unauthenticated read/write අවහිර කර, server එකට පමණක් අවශ්‍ය අවසර දෙන්න. Firebase admin secret එක source code හෝ public repository එකකට දාන්න එපා.
- WhatsApp session එක එකම server instance එකක පමණක් ධාවනය කරන්න. දෙකක් හෝ වැඩි replicas එකම phone session එක share කළොත් WhatsApp විසින් connection එක replace කර හෝ unlink කළ හැක.
- `.env` කිසිවිටෙක share/commit නොකරන්න. කලින් source archive එකේ තිබූ API keys දැනටමත් හෙළිවී තිබිය හැකි නිසා ඒවා provider dashboard වලින් revoke කර අලුත් keys ගන්න.

## Inbox සහ logout ගැන

- මෙහි “inbox” යනු bot එකේ WhatsApp පුද්ගලික chat එකයි; මෙම ව්‍යාපෘතියේ වෙනම web inbox/mailbox view එකක් නැත. View-once emoji reply සහ status save ඒ chat එකට යවයි.
- Settings/Admin login එක දැන් browser/app එක වසා නැවත විවෘත කළත් රැඳී සිටීමට local storage භාවිත කරයි. Server token එක භාවිතා වන විට කල් ඉකුත් වීම ඉදිරියට දිගු වේ; default inactive maximum කාලය දින 30කි. පොදු/අනාරක්ෂිත උපකරණයක භාවිතයෙන් පසු “Log out” ඔබන්න.
- WhatsApp විසින් linked device එක සැබෑවට unlink කළොත් code එකෙන් එය වළක්වන්න බැහැ. යාවත්කාලීන කළ bot එක revoked auth keys පමණක් ඉවත් කර settings/password/schedules තබා ගනී; pairing page එකෙන් නැවත link කරන්න.

## සීමාවන් හා වින්‍යාසය

- Media download එකකට default උපරිමය 80 MiB (`MAX_MEDIA_BYTES`) වේ. Server RAM අනුව එය අඩු කරන්න.
- `OPENWEATHER_API_KEY`, `ACRCLOUD_ACCESS_KEY` සහ `ACRCLOUD_ACCESS_SECRET` දුන්නොත් පමණක් ඒ provider commands වැඩ කරයි.
- `FIREBASE_URL`, `FIREBASE_SECRET`, `DASH_TTL_MS`, `HTTP_TIMEOUT_MS` ද `.env` මඟින් වෙනස් කළ හැක.
