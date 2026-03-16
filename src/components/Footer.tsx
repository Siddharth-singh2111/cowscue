import Link from "next/link";
import Image from "next/image";
import { Heart, Mail, Phone, MapPin, ArrowRight } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-slate-50 px-4 pb-4 sm:px-6 sm:pb-6 pt-12">
      {/* --- THE FLOATING ISLAND CONTAINER --- */}
      <div className="max-w-7xl mx-auto bg-slate-950 rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-slate-800">
        
        {/* Decorative Ambient Glowing Orbs */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600 opacity-80"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 px-8 py-12 md:px-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
            
            {/* COLUMN 1: Brand & Hero Statement (Takes up 5 columns on large screens) */}
            <div className="lg:col-span-5 space-y-8">
              <Link href="/" className="flex items-center gap-3 group w-fit">
                <div className="relative w-12 h-12 flex items-center justify-center bg-white rounded-2xl p-1.5 shadow-[0_0_20px_rgba(249,115,22,0.15)] group-hover:scale-105 transition-transform duration-300">
                  <Image 
                    src="/favicon.ico"
                    alt="Cowscue Logo" 
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <span className="font-extrabold text-3xl text-white tracking-tight">
                  Cow<span className="text-orange-500">Scue</span>
                </span>
              </Link>
              
              <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight">
                Giving a voice to the <span className="text-slate-500 italic">voiceless.</span>
              </h2>
              
              <p className="text-slate-400 leading-relaxed max-w-md text-sm sm:text-base">
                A rapid-response logistical platform bridging the gap between concerned citizens and animal rescue NGOs. Saving stray cattle, one click at a time.
              </p>
            </div>

            {/* COLUMN 2 & 3: Links & Contact (Takes up 7 columns on large screens) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-10 lg:gap-8">
              
              {/* Quick Links */}
              <div className="space-y-6">
                <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> Platform
                </h3>
                <ul className="space-y-4">
                  {[
                    { name: 'Home', path: '/' },
                    { name: 'Report Emergency', path: '/report' },
                    { name: 'My Impact', path: '/my-reports' },
                    { name: 'NGO Command Center', path: '/dashboard' }
                  ].map((link) => (
                    <li key={link.name}>
                      <Link 
                        href={link.path} 
                        className="text-slate-400 hover:text-orange-400 transition-all flex items-center gap-2 group text-sm font-medium w-fit"
                      >
                        <span className="group-hover:translate-x-1 transition-transform">{link.name}</span>
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact / Helplines */}
              <div className="space-y-6">
                <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Helpline Contact
                </h3>
                <ul className="space-y-5">
                  <li className="flex items-start gap-4 group cursor-pointer">
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl group-hover:border-orange-500/50 group-hover:bg-orange-500/10 transition-colors shrink-0">
                      <Phone size={18} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">+91 1800-COW-SAVE</p>
                      <p className="text-xs text-slate-500 mt-0.5">Toll-Free, 24/7 Dispatch</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 group cursor-pointer">
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl group-hover:border-orange-500/50 group-hover:bg-orange-500/10 transition-colors shrink-0">
                      <Mail size={18} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">help@cowscue.org</p>
                      <p className="text-xs text-slate-500 mt-0.5">Partnerships & Support</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 group cursor-pointer">
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl group-hover:border-orange-500/50 group-hover:bg-orange-500/10 transition-colors shrink-0">
                      <MapPin size={18} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Sri City, Andhra Pradesh</p>
                      <p className="text-xs text-slate-500 mt-0.5">Operational Headquarters</p>
                    </div>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-16 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
            <p>© {new Date().getFullYear()} CowScue Initiative. All rights reserved.</p>
            <p className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
              Built with <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" /> for the voiceless
            </p>
          </div>
        </div>
      </div>
      
      {/* Mobile Padding Helper: Ensures the footer content isn't hidden behind the fixed mobile bottom nav */}
      <div className="h-24 sm:hidden"></div>
    </footer>
  );
};

export default Footer;