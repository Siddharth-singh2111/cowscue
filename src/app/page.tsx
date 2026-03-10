import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Camera, MapPin, ShieldCheck, HeartHandshake, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION */}
      <section className="relative pt-24 pb-32 px-4 overflow-hidden bg-stone-50">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-orange-100/80 text-orange-700 text-sm font-semibold border border-orange-200/50">
              <span className="flex h-2 w-2 rounded-full bg-orange-500 mr-2 animate-pulse"></span>
              Live 
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              Save an injured cow with <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-800 to-amber-900">one photo.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Thousands of stray cattle are injured on our streets every day. 
              Cowscue instantly connects compassionate citizens with the nearest verified Gaushalas and rescue NGOs to ensure no animal suffers alone.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link href="/report">
                <Button size="lg" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white text-lg px-8 py-7 rounded-xl shadow-xl shadow-orange-600/20 transition-all hover:-translate-y-1">
                  <Camera className="mr-2 h-6 w-6" /> Report Emergency
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-7 rounded-xl border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Image/Graphic - Anchors the design and adds genuine emotional weight */}
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-200 to-amber-50 rounded-3xl transform rotate-3 scale-105 opacity-50"></div>
            <div className="relative bg-white p-3 rounded-3xl shadow-2xl border border-slate-100">
              <img 
                src="/favicon.ico" 
                alt="Compassionate rescue of a cow" 
                className="rounded-2xl w-full h-[450px] object-cover"
              />
              {/* Floating Trust Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full text-green-600">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Verified NGOs</p>
                  <p className="text-xs text-slate-500">Trusted Rescue Partners</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT STRIP */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-center">
          <div className="p-4">
            <div className="flex justify-center mb-4"><Clock className="text-amber-500" size={32} /></div>
            <div className="text-3xl font-bold mb-2">24/7 Active</div>
            <div className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">Our AI dispatch system never sleeps. Report emergencies anytime, anywhere.</div>
          </div>
          <div className="p-4">
            <div className="flex justify-center mb-4"><MapPin className="text-amber-500" size={32} /></div>
            <div className="text-3xl font-bold mb-2">Smart Routing</div>
            <div className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">Alerts are pinpointed to active NGOs within a 15km radius for the fastest response.</div>
          </div>
          <div className="p-4">
            <div className="flex justify-center mb-4"><HeartHandshake className="text-amber-500" size={32} /></div>
            <div className="text-3xl font-bold mb-2">Community Led</div>
            <div className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">Driven by compassion. Every report directly contributes to saving a voiceless life.</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-sm font-bold tracking-widest text-orange-600 uppercase mb-3">The Process</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900">Three steps to save a life.</h3>
            <p className="mt-4 text-slate-600 text-lg">You don't need to know who to call. Just provide the location, and our platform handles the logistics.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 relative">
            {/* Connecting Line (Desktop only) */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-slate-100 z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center group">
              <div className="h-24 w-24 bg-white rounded-2xl flex items-center justify-center text-slate-700 shadow-[0_0_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                <Camera size={40} className="text-orange-500" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">1. Snap a Photo</h4>
              <p className="text-slate-600 leading-relaxed px-4">
                Take a clear picture of the injured animal. Our AI instantly verifies the image to prevent spam and assess severity.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center group">
              <div className="h-24 w-24 bg-white rounded-2xl flex items-center justify-center text-slate-700 shadow-[0_0_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                <MapPin size={40} className="text-orange-500" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">2. Drop the Pin</h4>
              <p className="text-slate-600 leading-relaxed px-4">
                Allow location access to attach exact GPS coordinates. Add a brief description of the injury or situation.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center group">
              <div className="h-24 w-24 bg-white rounded-2xl flex items-center justify-center text-slate-700 shadow-[0_0_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                <ShieldCheck size={40} className="text-orange-500" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">3. Rescue Dispatched</h4>
              <p className="text-slate-600 leading-relaxed px-4">
                Nearby NGOs receive a high-priority WhatsApp alert with an optimized route directly to the animal's location.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-orange-50 py-24 px-4 border-t border-orange-100">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Ready to make a difference?</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Join the compassionate citizens in Sri City who are using Cowscue to bring timely medical aid to street cattle.
          </p>
          <Link href="/report" className="inline-block pt-4">
            <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white text-lg px-10 py-7 rounded-xl shadow-xl transition-all hover:-translate-y-1">
              Report an Emergency Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}