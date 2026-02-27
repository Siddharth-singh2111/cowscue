<div align="center">
  
  # 🚑 Cowscue
  **A Real-Time, AI-Powered Logistical Dispatch Platform for Animal Rescue**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-success?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
  [![Gemini](https://img.shields.io/badge/AI_Spam_Protection-Gemini-orange?style=for-the-badge&logo=google)](https://ai.google.dev/)
  [![Twilio](https://img.shields.io/badge/SMS_Alerts-Twilio-red?style=for-the-badge&logo=twilio)](https://www.twilio.com/)

  <p align="center">
    <a href="#the-problem">The Problem</a> •
    <a href="#key-features">Key Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#system-architecture">Architecture</a>
  </p>
</div>

---

## 🛑 The Problem: "Anna Pratha" & Rescue Logistics
In India, thousands of non-milking cows and male calves are abandoned daily. When these animals are injured or starving on the streets, everyday citizens want to help but don't know who to call. Meanwhile, local Gaushalas (shelters) and NGOs operate on razor-thin budgets, wasting fuel and time verifying fake reports or driving inefficient routes.

## 💡 The Solution: Cowscue
Cowscue bridges the gap between citizens and NGOs. It is a rapid-response platform that allows citizens to snap a geo-tagged photo of an injured animal. The system uses AI to verify the image, instantly alerts the nearest NGO via WhatsApp, updates a live command center, and calculates the most fuel-efficient rescue route using the Traveling Salesperson algorithm.

---

## ✨ Key Features

* **🤖 AI Spam Prevention:** Integrates **Google Gemini 2.5 Flash** vision models to automatically reject non-cattle images, saving NGOs from wasting time on trolls or false reports.
* **📍 Geospatial Querying:** Uses MongoDB `$near` operators and `2dsphere` indexing to ensure NGOs only see emergencies within their customizable operational radius (e.g., 15km).
* **🗺️ Batch Route Optimization (TSP):** Implements the **Project OSRM API** to solve the Traveling Salesperson Problem. NGOs can select multiple pending rescues, and the dashboard generates the most fuel-efficient driving route.
* **⚡ Real-Time Command Center:** Powered by **Pusher**, the NGO dashboard and user impact screens update instantly via WebSockets without requiring a page refresh.
* **📱 WhatsApp Dispatch Alerts:** Integrates the **Twilio API** to instantly send SMS/WhatsApp alerts with Google Maps deep-links directly to the NGO driver's phone.
* **🏆 Citizen Gamification:** Dynamically calculates "Karma Points" for users based on successfully resolved rescues to encourage continuous community engagement.

---

## 🛠️ Tech Stack

**Frontend:**
* [Next.js 14](https://nextjs.org/) (App Router)
* [React 19](https://react.dev/)
* [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
* [React-Leaflet](https://react-leaflet.js.org/) (OpenStreetMap integration)

**Backend & Database:**
* Next.js Route Handlers (Serverless APIs)
* [MongoDB Atlas](https://www.mongodb.com/) (Mongoose ODM + Geospatial Indexing)
* [Clerk](https://clerk.com/) (Authentication & RBAC)

**Third-Party Integrations:**
* **Google Gemini AI** (Vision-based spam detection)
* **Cloudinary** (Media storage and optimization)
* **Pusher** (Real-time WebSocket events)
* **Twilio** (WhatsApp Sandbox notifications)
* **Project OSRM** (Trip API for routing algorithms)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v18+) and npm/yarn/pnpm installed. You will also need accounts for Clerk, MongoDB, Cloudinary, Gemini AI, Pusher, and Twilio.

### 1. Clone the repository
```bash
git clone [https://github.com/YOUR_GITHUB_USERNAME/cowscue.git](https://github.com/YOUR_GITHUB_USERNAME/cowscue.git)
2. Install dependencies
Bash
npm install
3. Set up Environment Variables
Create a .env.local file in the root directory and add the following keys:

Code snippet
# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Database
MONGODB_URI=your_mongodb_connection_string

# Media Storage (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# AI Verification (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Real-Time Events (Pusher)
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret

# SMS/WhatsApp Notifications (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
NGO_WHATSAPP_NUMBER=whatsapp:+91YOURNUMBER
4. Run the Development Server
Bash
npm run dev
Open http://localhost:3000 with your browser to see the result.

🛣️ Future Roadmap (2026 Vision)
[ ] Native Android Responder App: Background GPS tracking for drivers.

[ ] Medical Triage ML Pipeline: Auto-categorize emergencies (Routine vs. Critical) based on image severity.

[ ] Hyper-Local Micro-Donations: Allow users to attach a UPI payment (₹100-₹500) to pre-fund a specific rescue's fuel costs.

🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

<div align="center">
<p>Built with ❤️ to give a voice to the voiceless.</p>
</div>


### Next Step for you:

1.  Copy this into your `README.md`.
2.  Do a `Ctrl+F` for `YOUR_GITHUB_USERNAME` and replace it with your actual GitHub username so the clone links work.
3.  Commit and push it: `git add README.md`, `git commit -m "docs: added awesome readme"`, `git push`.

Let me know if your Vercel deployment went green and if you want to tackle anything else\!
cd cowscue
