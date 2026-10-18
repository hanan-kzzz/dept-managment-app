const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

const AUTH_FOLDER = path.join(__dirname, 'baileys_auth_info');

let sock = null;
let isClientReady = false;
let latestQR = null;

async function connectToWhatsApp() {
    try {
        console.log('Initializing WhatsApp Baileys connection...');
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
            version: [2, 3000, 1015901307],
            isLatest: false
        }));

        console.log(`Using WhatsApp Web v${version.join('.')} (isLatest: ${isLatest})`);

        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: ['DebtManagement', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
        });

        // Save credentials whenever updated
        sock.ev.on('creds.update', saveCreds);

        // Handle connection lifecycle
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                latestQR = qr;
                console.log('\n--- SCAN THIS QR CODE WITH YOUR WHATSAPP ---');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error.output?.statusCode
                    : null;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`❌ WhatsApp connection closed (status code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
                isClientReady = false;
                latestQR = null;

                if (shouldReconnect) {
                    setTimeout(() => {
                        console.log('🔄 Reconnecting to WhatsApp...');
                        connectToWhatsApp();
                    }, 3000);
                } else {
                    console.log('🔒 Device logged out. Clearing stored credentials...');
                    try {
                        if (fs.existsSync(AUTH_FOLDER)) {
                            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                        }
                    } catch (e) {
                        console.error('Failed to remove auth directory:', e);
                    }
                    console.log('🔄 Starting fresh connection...');
                    setTimeout(() => connectToWhatsApp(), 2000);
                }
            } else if (connection === 'open') {
                console.log('\n✅ WhatsApp Client is ready and connected!');
                isClientReady = true;
                latestQR = null;
            }
        });
    } catch (err) {
        console.error('❌ Connection error in connectToWhatsApp:', err);
        setTimeout(() => connectToWhatsApp(), 5000);
    }
}

// Start WhatsApp socket
connectToWhatsApp();

// Endpoint for checking status and getting QR (matches frontend polling)
app.get('/status', (req, res) => {
    res.json({
        connected: isClientReady,
        qr: latestQR
    });
});

// Endpoint to send a message
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    if (!isClientReady || !sock) {
        return res.status(503).json({ 
            success: false, 
            error: 'WhatsApp client is not ready yet. Please scan the QR code in the terminal or Settings page.' 
        });
    }

    if (!phone || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Phone number and message are required.' 
        });
    }

    try {
        // Clean phone number: digits only (e.g. 919876543210)
        const cleanPhone = String(phone).replace(/[^0-9]/g, '');
        if (!cleanPhone) {
            return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
        }

        // WhatsApp user JID format: <number>@s.whatsapp.net
        const jid = `${cleanPhone}@s.whatsapp.net`;

        console.log(`Sending message to ${cleanPhone} (${jid})...`);
        await sock.sendMessage(jid, { text: message });
        console.log(`✅ Message sent successfully to ${cleanPhone}`);

        res.json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        console.error('❌ Failed to send message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send message: ' + (error?.message || error) 
        });
    }
});

// Optional endpoint to manually logout/clear session
app.post('/logout', async (req, res) => {
    try {
        if (sock) {
            await sock.logout().catch(() => {});
            sock.end(undefined);
            sock = null;
        }
        if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        }
        isClientReady = false;
        latestQR = null;
        console.log('Session cleared. Restarting connection for new pairing...');
        connectToWhatsApp();
        res.json({ success: true, message: 'Session cleared and restarted successfully.' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 WhatsApp Baileys API Server running at http://localhost:${port}`);
});
