const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize WhatsApp Client (saves session locally)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isClientReady = false;
let latestQR = null;

// Generate QR Code for authentication
client.on('qr', (qr) => {
    console.log('\n--- SCAN THIS QR CODE WITH YOUR WHATSAPP ---');
    qrcode.generate(qr, { small: true });
    latestQR = qr;
});

// Client is ready
client.on('ready', () => {
    console.log('\n✅ WhatsApp Client is ready and connected!');
    isClientReady = true;
    latestQR = null;
});

// Handle disconnects
client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp Client was disconnected:', reason);
    isClientReady = false;
    latestQR = null;
});

// Endpoint for checking status and getting QR
app.get('/status', (req, res) => {
    res.json({
        connected: isClientReady,
        qr: latestQR
    });
});

// Initialize client
console.log('Initializing WhatsApp Client...');
client.initialize();

// API Endpoint to send a message
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    if (!isClientReady) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready yet. Please scan the QR code in the terminal.' });
    }

    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Phone number and message are required.' });
    }

    try {
        // Format phone number to WhatsApp ID format (e.g., 919876543210@c.us)
        // Remove all non-numeric characters (like + or spaces)
        const cleanPhone = String(phone).replace(/[^0-9]/g, '');
        const chatId = `${cleanPhone}@c.us`;

        console.log(`Sending message to ${cleanPhone}...`);
        await client.sendMessage(chatId, message);
        console.log(`✅ Message sent to ${cleanPhone}`);

        res.json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        console.error('❌ Failed to send message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message: ' + error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 WhatsApp API Server running at http://localhost:${port}`);
});
