import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Camera, MapPin, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden bg-brand-50">
     
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-bold mb-4 border border-orange-200">
            🚑 Project Cowscue: Save a Life Today
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Rescue Stray Cattle <br />
            <span className="text-orange-600">With One Click.</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Every day, thousands of calves and injured cows are abandoned. 
            Use our app to geotag them and alert nearby Gaushalas instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/report">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white text-lg px-8 py-7 rounded-full shadow-xl hover:shadow-2xl transition-all w-full sm:w-auto">
                <Camera className="mr-2 h-6 w-6" /> Report a Cow
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="text-lg px-8 py-7 rounded-full border-2 w-full sm:w-auto">
                How it Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="bg-slate-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-orange-500">24/7</div>
            <div className="text-slate-400 mt-2">Emergency Reporting</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-orange-500">10km</div>
            <div className="text-slate-400 mt-2">Radius Search for NGOs</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-orange-500">100%</div>
            <div className="text-slate-400 mt-2">Non-Profit Initiative</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 text-slate-800">How You Can Help</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <Camera size={32} />
              </div>
              <h3 className="text-xl font-bold">1. Snap a Photo</h3>
              <p className="text-slate-500">
                Take a picture or video of the injured stray cow.
              </p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <MapPin size={32} />
              </div>
              <h3 className="text-xl font-bold">2. Auto-Location</h3>
              <p className="text-slate-500">
                We automatically detect your GPS coordinates to pinpoint the animal.
              </p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold">3. Rescue Dispatched</h3>
              <p className="text-slate-500">
                Nearby registered NGOs receive an alert and dispatch a vehicle.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}