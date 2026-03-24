// index.js (in cowscue-bot folder)
require('dotenv').config();

const { Client, RemoteAuth } = require('whatsapp-web.js'); // 🟢 Changed to RemoteAuth
const { MongoStore } = require('wwebjs-mongo'); // 🟢 Added MongoStore
const mongoose = require('mongoose'); // 🟢 Added mongoose
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const Pusher = require('pusher-js');
const express = require('express');

const userState = new Map();
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
    res.send('✅ Cowscue WhatsApp Bot is running 24/7 with MongoDB Auth!');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

const NEXTJS_API_URL = 'https://cowscue.vercel.app/api/webhook/whatsapp'; // Ensure this matches your production URL
const BOT_SECRET_KEY = process.env.BOT_SECRET_KEY; 

// --- PUSHER SETUP ---
const pusher = new Pusher(process.env.PUSHER_KEY || 'YOUR_PUSHER_KEY', {
  cluster: process.env.PUSHER_CLUSTER || 'YOUR_PUSHER_CLUSTER',
  encrypted: true
});

// --- MONGODB CONNECTION & BOT INITIALIZATION ---
mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('✅ Connected to MongoDB for WhatsApp Session Storage');
    
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000 // Saves session every 5 mins
        }),
        puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    });

    // --- PUSHER LISTENER ---
    const channel = pusher.subscribe('cowscue-alerts');
    channel.bind('status-update', async (updatedReport) => {
        console.log(`Received status update for report: ${updatedReport._id}`);
        
        if (updatedReport.reporterId && updatedReport.reporterId.startsWith('whatsapp-')) {
            const phoneFormat = `${updatedReport.reporterPhone}@c.us`;

            try {
                if (updatedReport.status === 'assigned') {
                    await client.sendMessage(phoneFormat,
                        "🚑 *Rescue Update!*\n\n" +
                        "An NGO has accepted your rescue request and a driver is currently on the way to the location you pinned."
                    );
                }
                else if (updatedReport.status === 'resolved') {
                    const newTotal = updatedReport.reporterHistory + 1;
                    await client.sendMessage(phoneFormat,
                        "✅ *Rescue Successful!*\n\n" +
                        "The cow has been safely secured by the NGO.\n\n" +
                        `⭐ *Karma Points Updated:* You are now a Level ${newTotal > 5 ? '2' : '1'} Trusted Citizen with ${newTotal} successful rescues!\n\n` +
                        "Thank you for giving a voice to the voiceless."
                    );
                }
            } catch (error) {
                console.error("Failed to send WhatsApp status update:", error);
            }
        }
    });

    // --- STANDARD BOT LOGIC ---
    client.on('qr', (qr) => {
        console.log('\n--- SCAN THIS QR CODE (ONLY REQUIRED ONCE) ---');
        qrcode.generate(qr, { small: true });
    });

    client.on('remote_session_saved', () => {
        console.log('✅ WhatsApp Session successfully backed up to MongoDB!');
    });

    client.on('ready', () => {
        console.log('✅ Cowscue Bot is online and ready to receive messages!');
    });

    client.on('message_create', async (msg) => {
        // 🟢 THE SPAM FIX: Ignore messages sent by the bot itself!
        if (msg.fromMe) return;

        console.log(`\n📩 --- NEW MESSAGE DETECTED ---`);
        console.log(`From: ${msg.from}`);
        console.log(`Type: ${msg.type}`);
        console.log(`Has Media: ${msg.hasMedia}`);

        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const phone = msg.from;

        if (!userState.has(phone)) {
            userState.set(phone, { base64Image: null, lat: null, lng: null });
        }
        const state = userState.get(phone);

        await chat.sendStateTyping();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 1. Handle incoming Text
        if (msg.body && !msg.hasMedia && msg.type !== 'location') {
            console.log(`🤖 Replying to text message...`);
            await msg.reply(
                "🚑 *Cowscue Emergency Bot*\n\n" +
                "Please send a *Photo* of the injured cow first."
            );
            return;
        }

        // 2. Handle incoming Photo
        if (msg.hasMedia) {
            console.log(`📸 Downloading media...`);
            const media = await msg.downloadMedia();
            if (media && media.mimetype && media.mimetype.includes('image')) {
                state.base64Image = media.data;
                console.log(`✅ Image saved to bot memory. Asking for location...`);
                await msg.reply("📸 Image saved! Now, click the 📎 attachment icon and send your *Location* to dispatch the NGO.");
                return;
            }
        }

        // 3. Handle incoming Location & Trigger Next.js API
        if (msg.type === 'location') {
            console.log(`📍 Location received! Checking for image...`);
            if (!state.base64Image) {
                await msg.reply("❌ Please send a photo of the cow first!");
                return;
            }

            await msg.reply("⏳ Verifying image with AI and dispatching NGOs...");

            try {
                console.log(`🚀 Sending data to Vercel: ${NEXTJS_API_URL}`);
                
                const response = await axios.post(NEXTJS_API_URL, {
                    base64Image: state.base64Image,
                    phone: phone.replace('@c.us', ''),
                    latitude: msg.location.latitude,
                    longitude: msg.location.longitude
                }, {
                    headers: { 'Authorization': `Bearer ${BOT_SECRET_KEY}` }
                });

                console.log(`✅ Vercel accepted the report!`);
                await msg.reply("✅ *Emergency Reported Successfully!*\n\nThe command center has been updated and drivers are notified.");
                userState.delete(phone); 
                
            } catch (error) {
                console.error(`🚨 VERCEL REJECTED THE REQUEST:`, error.response?.data || error.message);
                if (error.response && error.response.status === 400) {
                    await msg.reply("❌ AI Verification Failed: We couldn't detect a cow. Please send a clearer photo.");
                    state.base64Image = null;
                } else {
                    await msg.reply("❌ Server error. Please try again later.");
                }
            }
        }
    });

    client.initialize();

}).catch(err => {
    console.error("❌ Failed to connect to MongoDB:", err);
});