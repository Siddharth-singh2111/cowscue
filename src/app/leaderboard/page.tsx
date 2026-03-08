// src/app/leaderboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Star, ShieldCheck } from "lucide-react";
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
            case 1: return <Trophy className="text-yellow-500 fill-yellow-100" size={32} />;
            case 2: return <Medal className="text-slate-400 fill-slate-100" size={28} />;
            case 3: return <Medal className="text-amber-600 fill-amber-100" size={28} />;
            default: return <span className="font-bold text-slate-400 text-lg w-8 text-center">#{rank}</span>;
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 bg-slate-50">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="text-center space-y-4 py-8">
                    <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 border-4 border-yellow-200">
                        <Trophy className="text-yellow-600" size={32} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                        Heroes <span className="text-orange-600">Leaderboard</span>
                    </h1>
                    <p className="text-lg text-slate-600">
                        Honoring the citizens who have saved the most voiceless lives.
                    </p>
                </div>

                {/* Leaderboard List */}
                <Card className="bg-white shadow-xl border-0 overflow-hidden">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500 animate-pulse">Loading top rescuers...</div>
                        ) : leaders.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">No rescued cattle yet. Be the first!</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {leaders.map((leader) => (
                                    <div
                                        key={leader.id}
                                        className={`flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 transition-colors ${leader.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-white' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 sm:gap-6">
                                            <div className="flex items-center justify-center w-10">
                                                {getMedalIcon(leader.rank)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                    {leader.name}
                                                    {leader.rank === 1 && (
                                                        <span title="Top Contributor" className="inline-flex">
                                                            <ShieldCheck className="text-blue-500" size={18} />
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                    {leader.karma} Karma Points
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-sm px-3 py-1">
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