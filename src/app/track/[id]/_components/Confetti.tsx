"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";

const EMOJI = ["💛", "🧡", "🌼", "✨", "🐄"];

/** Short celebratory emoji fall. Renders nothing for users who prefer reduced motion. */
export function Confetti({ burst }: { burst: number }) {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: `${(i * 37 + burst * 13) % 100}%`,
        delay: `${((i * 7) % 15) / 10}s`,
        duration: `${2.8 + ((i * 11) % 20) / 10}s`,
        emoji: EMOJI[i % EMOJI.length],
      })),
    [burst]
  );
  if (reduce || burst === 0) return null;
  return (
    <div key={burst} className="pointer-events-none fixed inset-0 z-[1200] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-8 animate-fall text-2xl"
          style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
