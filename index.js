try { require('dotenv').config(); } catch (e) {}

const express = require('express');
const path = require('path');

const app = express();
const ROOT = process.cwd();
const PORT = process.env.PORT || 8000;

require('events').EventEmitter.defaultMaxListeners = 500;

// Heroku / Render / Koyeb wage proxy ekak passe inna nisa (rate limit walata ona)
app.set('trust proxy', 1);

// Body parsers routes walata ISSELLA
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const code = require('./pair');

app.use('/code', code);

app.get('/pair', (req, res) => {
    res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

app.use(express.static(path.join(ROOT, 'public'), { index: false }));

app.use((req, res) => {
    res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`
Don't Forget To Give Star ‼️

Forward By Anuhas Bandara

Server running on http://localhost:${PORT}`);
});

// Flush persisted auth state once, then let the hosting supervisor restart fatal failures.
let shuttingDown = false;
const shutdown = async (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, saving sessions...`);
    try { await code.shutdown(); } catch (e) { console.error(e); }
    server.close(() => process.exit(exitCode));
    setTimeout(() => process.exit(exitCode), 8000).unref();
};
process.on('uncaughtException', (err) => {
    console.error('Fatal uncaught exception:', err);
    shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (err) => {
    console.error('Fatal unhandled rejection:', err);
    shutdown('unhandledRejection', 1);
});
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
