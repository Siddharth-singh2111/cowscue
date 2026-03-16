"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Camera, MapPin, ShieldCheck, HeartHandshake, Clock, Activity, Users } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 selection:bg-orange-200">
      
      {/* 1. CINEMATIC HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-12 px-4 sm:px-6 overflow-hidden">
        {/* Full Bleed Background Image with Dark Overlay */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/image.png" 
            alt="" 
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-slate-950/70 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent"></div>
        </div>

        {/* Floating Glass Island Hero Card */}
        <div className="relative z-10 w-full max-w-5xl mx-auto mt-16 sm:mt-8">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 sm:p-12 md:p-16 rounded-[2.5rem] shadow-2xl text-center space-y-8 overflow-hidden relative">
            
            {/* Soft internal glow */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-500/30 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium backdrop-blur-md">
              <span className="flex h-2.5 w-2.5 rounded-full bg-green-400 mr-3 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
              Active in Sri City, Andhra Pradesh
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto drop-shadow-lg">
              Save an injured cow with <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">one photo.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-200 leading-relaxed max-w-2xl mx-auto font-medium">
              Thousands of stray cattle suffer on our streets. Snap a picture, drop a pin, and our AI instantly dispatches the nearest verified Gaushala.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 relative z-20">
              <Link href="/report" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg px-8 rounded-full shadow-lg shadow-orange-500/25 border-0 transition-transform hover:-translate-y-1">
                  <Camera className="mr-2 h-5 w-5" /> Report Emergency
                </Button>
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 text-lg px-8 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-md transition-all">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BENTO-BOX IMPACT STATS */}
      <section className="relative -mt-16 z-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
            <div className="h-14 w-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
              <Clock size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">24/7 AI Dispatch</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Our Gemini-powered system never sleeps. Emergencies are routed instantly, any time of day.</p>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-900/20 border border-slate-800 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full"></div>
            <div className="h-14 w-14 bg-slate-800 rounded-2xl flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <MapPin size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Radius Routing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Alerts are pinpointed to active NGOs within a 15km radius ensuring the fastest possible response.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
            <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Community Driven</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Join hundreds of compassionate citizens. Earn Karma points for every successful rescue.</p>
          </div>

        </div>
      </section>

      {/* 3. HOW IT WORKS (Modernized) */}
      <section id="how-it-works" className="py-32 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-widest mb-4">
              The Process
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Three steps to <span className="italic text-slate-400 font-serif">save a life.</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border-4 border-slate-50 mb-8 relative">
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">1</div>
                <Camera size={32} className="text-orange-500" />
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mb-3">Snap a Photo</h4>
              <p className="text-slate-500 leading-relaxed px-4 text-base">
                Take a clear picture of the injured animal. Our AI instantly verifies the image to prevent spam and assess severity.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border-4 border-slate-50 mb-8 relative">
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">2</div>
                <MapPin size={32} className="text-orange-500" />
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mb-3">Drop the Pin</h4>
              <p className="text-slate-500 leading-relaxed px-4 text-base">
                Allow location access to attach exact GPS coordinates. Add a brief description of the injury or situation.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border-4 border-slate-50 mb-8 relative">
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">3</div>
                <ShieldCheck size={32} className="text-orange-500" />
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mb-3">Rescue Dispatched</h4>
              <p className="text-slate-500 leading-relaxed px-4 text-base">
                Nearby NGOs receive a high-priority WhatsApp alert with an optimized route directly to the animal's location.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PREMIUM CTA SECTION */}
      <section className="py-24 px-4 sm:px-6 mb-12">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-orange-500 to-amber-600 rounded-[3rem] p-10 sm:p-16 text-center relative overflow-hidden shadow-2xl shadow-orange-500/20">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Ready to make a difference?</h2>
            <p className="text-xl text-orange-50 max-w-2xl mx-auto font-medium">
              Join the compassionate citizens who are using Cowscue to bring timely medical aid to street cattle.
            </p>
            <div className="pt-4">
              <Link href="/report" className="inline-block">
                <Button size="lg" className="h-14 bg-white hover:bg-slate-50 text-orange-600 text-lg px-10 rounded-full shadow-xl transition-transform hover:-translate-y-1 font-bold">
                  Report an Emergency Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}