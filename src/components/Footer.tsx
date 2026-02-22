import Link from "next/link";
import { ShieldPlus, Heart, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          
          {/* Column 1: Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="bg-orange-500 p-1.5 rounded-lg text-white">
                <ShieldPlus size={20} />
              </div>
              <span className="font-extrabold text-xl tracking-tight">
                Cow<span className="text-orange-500">Scue</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              A rapid-response logistical platform bridging the gap between concerned citizens and animal rescue NGOs. Saving stray cattle, one click at a time.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="hover:text-orange-400 transition-colors flex items-center gap-2">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/report" className="hover:text-orange-400 transition-colors flex items-center gap-2">
                  Report an Emergency
                </Link>
              </li>
              <li>
                <Link href="/my-reports" className="hover:text-orange-400 transition-colors flex items-center gap-2">
                  My Impact
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-orange-400 transition-colors flex items-center gap-2">
                  NGO Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact / Helplines */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Helpline Contact</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <Phone size={16} className="text-orange-500 mt-0.5 shrink-0" />
                <span>+91 1800-COW-SAVE<br/>(Toll-Free, 24/7)</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-orange-500 shrink-0" />
                <span>help@cowscue.org</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-orange-500 mt-0.5 shrink-0" />
                <span>Headquarters<br/>New Delhi, India</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CowScue Initiative. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart size={12} className="text-red-500 fill-red-500" /> for the voiceless.
          </p>
        </div>
      </div>
      
      {/* Mobile Padding Helper: Ensures the footer content isn't hidden behind the fixed mobile bottom nav */}
      <div className="h-16 sm:hidden"></div>
    </footer>
  );
};

export default Footer;