"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Star, ShieldCheck, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Leader {
    rank: number;
    id: string;
    name: string;
    rescues: number;
    karma: number;
}

export default function LeaderboardPage() {
    const [leaders, setLeaders] = useState<Leader[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch("/api/leaderboard");
                const data = await res.json();
                setLeaders(data.leaders || []);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getMedalIcon = (rank: number) => {
        switch (rank) {
            case 1: 
              return (
                <div className="bg-gradient-to-br from-yellow-300 to-amber-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/40 border-2 border-white">
                  <Crown className="text-white" size={24} strokeWidth={2.5} />
                </div>
              );
            case 2: 
              return (
                <div className="bg-gradient-to-br from-slate-300 to-slate-400 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-slate-400/40 border-2 border-white">
                  <Medal className="text-white" size={24} strokeWidth={2.5} />
                </div>
              );
            case 3: 
              return (
                <div className="bg-gradient-to-br from-amber-600 to-orange-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/40 border-2 border-white">
                  <Medal className="text-white" size={24} strokeWidth={2.5} />
                </div>
              );
            default: 
              return (
                <div className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center border border-slate-200">
                  <span className="font-extrabold text-slate-500 text-sm">#{rank}</span>
                </div>
              );
        }
    };

    const getRowStyle = (rank: number) => {
      switch(rank) {
        case 1: return "bg-gradient-to-r from-yellow-50/80 to-transparent border-l-4 border-yellow-400";
        case 2: return "bg-gradient-to-r from-slate-50/80 to-transparent border-l-4 border-slate-300";
        case 3: return "bg-gradient-to-r from-orange-50/80 to-transparent border-l-4 border-orange-400";
        default: return "border-l-4 border-transparent hover:border-slate-200";
      }
    };

    return (
        <div className="min-h-screen pt-28 md:pt-36 pb-24 px-4 sm:px-6 relative overflow-hidden bg-slate-50">
            
            {/* Ambient Background Blur for the Trophy Theme */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-yellow-400/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-4xl mx-auto space-y-10 relative z-10">

                {/* HEADER SECTION */}
                <div className="text-center space-y-4 mb-12">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-100 to-amber-50 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner border border-yellow-200/50 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <Trophy className="text-yellow-600 fill-yellow-500" size={40} />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
                        Heroes <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Leaderboard</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
                        Honoring the compassionate citizens who have stepped up to save the most voiceless lives.
                    </p>
                </div>

                {/* LEADERBOARD LIST */}
                <Card className="rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 bg-white/80 backdrop-blur-xl overflow-hidden">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-24 flex flex-col items-center justify-center">
                              <div className="w-10 h-10 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                              <p className="text-slate-500 font-bold animate-pulse">Loading top rescuers...</p>
                            </div>
                        ) : leaders.length === 0 ? (
                            <div className="p-24 text-center">
                              <div className="bg-slate-100 p-6 rounded-full w-fit mx-auto mb-4">
                                <Star size={32} className="text-slate-400" />
                              </div>
                              <p className="text-xl font-bold text-slate-700 mb-2">No rescued cattle yet.</p>
                              <p className="text-slate-500">Be the very first hero to climb the ranks!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100/50">
                                {leaders.map((leader) => (
                                    <div
                                        key={leader.id}
                                        className={`flex items-center justify-between p-4 sm:p-6 transition-all duration-300 hover:bg-slate-50 hover:scale-[1.01] ${getRowStyle(leader.rank)}`}
                                    >
                                        <div className="flex items-center gap-4 sm:gap-6">
                                            <div className="flex items-center justify-center w-12 shrink-0">
                                                {getMedalIcon(leader.rank)}
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-extrabold text-slate-800 text-lg sm:text-xl flex items-center gap-2">
                                                    {leader.name}
                                                    {leader.rank === 1 && (
                                                        <span title="Top Contributor" className="inline-flex bg-blue-50 p-1 rounded-full border border-blue-100">
                                                            <ShieldCheck className="text-blue-500" size={16} />
                                                        </span>
                                                    )}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                                                      <Star size={12} className="text-yellow-600 fill-yellow-500" />
                                                      <span className="text-xs font-bold text-yellow-700">{leader.karma} Karma</span>
                                                  </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <Badge variant="secondary" className="bg-slate-900 text-white text-sm sm:text-base px-4 py-1.5 rounded-full shadow-md font-bold">
                                                {leader.rescues} Rescues
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                
            </div>
        </div>
    );
}