"use client";

import { motion, useReducedMotion } from "motion/react";
import { Crown } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { cn } from "@/lib/utils";
import { BadgePill } from "./BadgePill";

const ORDER = [1, 0, 2]; // silver, gold, bronze — gold in the middle
const HEIGHT = ["h-36 sm:h-44", "h-28 sm:h-32", "h-20 sm:h-24"];
const MEDAL = ["bg-[linear-gradient(135deg,#f7d774,#d8a521)]", "bg-[linear-gradient(135deg,#e6e6e6,#a8a8a8)]", "bg-[linear-gradient(135deg,#f0b27a,#b8692d)]"];

export function Podium({ leaders }: { leaders: LeaderboardEntry[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Top three rescuers">
      {ORDER.map((idx, col) => {
        const l = leaders[idx];
        if (!l) return <div key={col} />;
        return (
          <motion.div
            key={l.id}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + col * 0.08, type: "spring", stiffness: 220, damping: 22 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="relative">
              {idx === 0 && <Crown className="absolute -top-6 left-1/2 size-5 -translate-x-1/2 text-moderate" aria-hidden />}
              <div
                className={cn(
                  "grid place-items-center rounded-full text-lg font-semibold text-black/80 shadow-[var(--shadow-soft)] ring-4 ring-background",
                  idx === 0 ? "size-16 sm:size-20" : "size-12 sm:size-16",
                  MEDAL[idx]
                )}
              >
                {l.name.slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 max-w-full">
              <p className="truncate text-sm font-semibold sm:text-base">{l.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{l.karma.toLocaleString("en-IN")} karma</p>
            </div>
            <div className="hidden sm:block">
              <BadgePill badge={l.badge} />
            </div>
            <div
              className={cn(
                "flex w-full items-start justify-center rounded-t-2xl border border-b-0 bg-card pt-3 text-2xl font-semibold text-muted-foreground",
                HEIGHT[idx]
              )}
            >
              {idx + 1}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
