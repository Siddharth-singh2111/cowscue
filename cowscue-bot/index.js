require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const Pusher = require('pusher-js');
const express = require('express');

// Fail loudly on missing env vars
const REQUIRED_ENV = ['PUSHER_KEY', 'PUSHER_CLUSTER', 'BOT_SECRET_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const NEXTJS_API_URL = process.env.NEXTJS_API_URL || 'https://cowscue.vercel.app/api/webhook/whatsapp';
const BOT_SECRET_KEY = process.env.BOT_SECRET_KEY;
const userState = new Map();

const app = express();
app.get('/', (req, res) => res.send('✅ Cowscue Bot running!'));
app.listen(process.env.PORT || 3001, () => console.log(`Health check on port ${process.env.PORT || 3001}`));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] },
});

const pusher = new Pusher(process.env.PUSHER_KEY, {
  cluster: process.env.PUSHER_CLUSTER,
  encrypted: true,
});

pusher.subscribe('cowscue-alerts').bind('status-update', async (updated) => {
  if (!updated.reporterId?.startsWith('whatsapp-')) return;
  const phoneFormat = `${updated.reporterPhone}@c.us`;
  try {
    if (updated.status === 'assigned') {
      await client.sendMessage(phoneFormat,
        '🚑 *Rescue Update!*\n\nAn NGO has accepted your request and a driver is on the way.\n\n' +
        (updated.ngoNotes ? `📝 NGO Note: ${updated.ngoNotes}` : 'Please stay near the location you pinned.')
      );
    } else if (updated.status === 'resolved') {
      const rescues = (updated.reporterHistory || 0) + 1;
      await client.sendMessage(phoneFormat,
        '✅ *Rescue Successful!*\n\nThe animal is safely secured. 🐄❤️\n\n' +
        `⭐ You now have ${rescues} successful rescues!\n\nThank you for giving a voice to the voiceless. 🙏`
      );
    }
  } catch (e) { console.error('WhatsApp send failed:', e.message); }
});

client.on('qr', (qr) => { console.log('\n--- SCAN QR ---'); qrcode.generate(qr, { small: true }); });
client.on('ready', () => console.log('✅ Cowscue Bot online!'));
client.on('disconnected', (reason) => { console.warn(`Disconnected: ${reason}. Reconnecting...`); client.initialize(); });

client.on('message', async (msg) => {
  const chat = await msg.getChat();
  if (chat.isGroup) return;

  const phone = msg.from;
  if (!userState.has(phone)) userState.set(phone, { base64Image: null, step: 'idle' });
  const state = userState.get(phone);

  await chat.sendStateTyping();
  await new Promise((r) => setTimeout(r, 800));

  if (msg.type === 'chat') {
    const lower = msg.body.toLowerCase().trim();
    if (['help','hi','hello','start'].includes(lower)) {
      await msg.reply('🚑 *Cowscue Emergency Bot*\n\n1️⃣ Send a *Photo* of the injured cow\n2️⃣ Then share your *Location* (📎 → Location)\n\nWe\'ll alert the nearest NGO instantly.');
      return;
    }
    await msg.reply(state.step === 'waiting_location'
      ? '📍 Got the photo! Now share your *Location* (📎 → Location).'
      : '👋 Please send a *Photo* first. Type *help* for instructions.');
    return;
  }

  if (msg.hasMedia) {
    const media = await msg.downloadMedia();
    if (media?.mimetype.includes('image')) {
      state.base64Image = media.data;
      state.step = 'waiting_location';
      await msg.reply('📸 *Image saved!*\n\nNow tap 📎 and send your *Location* to dispatch the nearest NGO.');
    } else {
      await msg.reply('⚠️ Please send a *photo*, not a video or file.');
    }
    return;
  }

  if (msg.type === 'location') {
    if (!state.base64Image) { await msg.reply('❌ Please send a *photo* first, then share your location.'); return; }
    await msg.reply('⏳ *Processing...* AI verifying image and dispatching NGOs. Please wait.');
    try {
      await axios.post(NEXTJS_API_URL, {
        base64Image: state.base64Image,
        phone: phone.replace('@c.us', ''),
        latitude: msg.location.latitude,
        longitude: msg.location.longitude,
      }, { headers: { Authorization: `Bearer ${BOT_SECRET_KEY}` }, timeout: 30000 });

      await msg.reply('✅ *Reported Successfully!*\n\nYou\'ll get a message when an NGO accepts the rescue. 🙏');
      userState.delete(phone);
    } catch (error) {
      if (error.response?.status === 400) {
        await msg.reply('❌ *AI could not detect a cow.*\n\nPlease send a clearer, well-lit photo.');
        state.base64Image = null;
        state.step = 'idle';
      } else {
        console.error('API error:', error.response?.data || error.message);
        await msg.reply('❌ Server error. Please try again in a moment.');
      }
    }
  }
});

console.log('🚀 Starting Cowscue WhatsApp Bot...');
client.initialize();