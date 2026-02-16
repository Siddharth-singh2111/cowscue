// src/app/page.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-20 px-4">
      <h1 className="text-4xl md:text-6xl font-extrabold text-center text-slate-900 mb-6">
        Help the voiceless on the streets.
      </h1>
      <p className="text-xl text-slate-600 text-center max-w-2xl mb-8">
        Cowscue connects injured stray cattle with the nearest Gaushalas and NGOs instantly.
      </p>
      
      <Link href="/report">
        <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6 rounded-full">
          Report an Injured/Stray Cow Now
        </Button>
      </Link>
    </div>
  );
}