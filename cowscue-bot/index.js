// index.js (in cowscue-bot folder)
require('dotenv').config(); // Loads environment variables from a .env file
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const Pusher = require('pusher-js'); // 🟢 NEW: Real-time listener

// Map to hold temporary user data while they send photo then location
const userState = new Map(); 

// Replace this with your Vercel URL when you deploy!
const NEXTJS_API_URL = 'https://cowscue.vercel.app/api/webhook/whatsapp'; 
const BOT_SECRET_KEY = 'my_super_secret_password_123'; // Must match your Next.js .env

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// 🟢 NEW: Connect the bot to your Next.js real-time events!
const pusher = new Pusher(process.env.PUSHER_KEY || 'YOUR_PUSHER_KEY', {
  cluster: process.env.PUSHER_CLUSTER || 'YOUR_PUSHER_CLUSTER',
  encrypted: true
});

const channel = pusher.subscribe('cowscue-alerts');

channel.bind('status-update', async (updatedReport) => {
    console.log(`Received status update for report: ${updatedReport._id}`);

    // Check if this report was made by a WhatsApp user
    if (updatedReport.reporterId && updatedReport.reporterId.startsWith('whatsapp-')) {
        const phoneFormat = `${updatedReport.reporterPhone}@c.us`; // Format it back for the bot

        try {
            if (updatedReport.status === 'assigned') {
                await client.sendMessage(phoneFormat, 
                    "🚑 *Rescue Update!*\n\n" +
                    "An NGO has accepted your rescue request and a driver is currently on the way to the location you pinned."
                );
            } 
            else if (updatedReport.status === 'resolved') {
                // Calculate their new gamified total (previous history + 1)
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
    console.log('\n--- SCAN THIS QR CODE ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Cowscue Bot is online and connected to Next.js API!');
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const phone = msg.from; // e.g., '919876543210@c.us'

    // Create a temporary memory slot for this user if they don't have one
    if (!userState.has(phone)) {
        userState.set(phone, { base64Image: null, lat: null, lng: null });
    }
    const state = userState.get(phone);

    await chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Human delay

    // 1. Handle incoming Text
    if (msg.body && !msg.hasMedia && msg.type !== 'location') {
        await msg.reply(
            "🚑 *Cowscue Emergency Bot*\n\n" +
            "Please send a *Photo* of the injured cow first."
        );
        return;
    }

    // 2. Handle incoming Photo
    if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        if (media.mimetype.includes('image')) {
            state.base64Image = media.data; // Save image to memory
            await msg.reply("📸 Image saved! Now, click the 📎 attachment icon and send your *Location* to dispatch the NGO.");
            return;
        }
    }

    // 3. Handle incoming Location & Trigger Next.js API
    if (msg.type === 'location') {
        if (!state.base64Image) {
            await msg.reply("❌ Please send a photo of the cow first!");
            return;
        }

        await msg.reply("⏳ Verifying image with AI and dispatching NGOs...");

        try {
            // Send data to Next.js Webhook
            const response = await axios.post(NEXTJS_API_URL, {
                base64Image: state.base64Image,
                phone: phone.replace('@c.us', ''), // Clean up the phone string
                latitude: msg.location.latitude,
                longitude: msg.location.longitude
            }, {
                headers: { 'Authorization': `Bearer ${BOT_SECRET_KEY}` }
            });

            await msg.reply("✅ *Emergency Reported Successfully!*\n\nThe command center has been updated and drivers are notified.");
            userState.delete(phone); // Clear memory
            
        } catch (error) {
            if (error.response && error.response.status === 400) {
                await msg.reply("❌ AI Verification Failed: We couldn't detect a cow. Please send a clearer photo.");
                state.base64Image = null; 
            } else {
                console.error(error.response?.data || error.message);
                await msg.reply("❌ Server error. Please try again later.");
            }
        }
    }
});

client.initialize();