import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, Megaphone, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { leaderboard } from "@/server/services/stats";
import { logger } from "@/server/lib/logger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Podium } from "./_components/Podium";
import { RankTable } from "./_components/RankTable";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "The citizens who've helped rescue the most injured cattle on Cowscue.",
};

// Data is cached in Redis for 2 minutes by the stats service; rendering per request keeps builds DB-free.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let leaders: LeaderboardEntry[] | null = null;
  try {
    leaders = await leaderboard();
  } catch (err) {
    logger.error({ err }, "leaderboard render failed");
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-grid mask-fade-b opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <PageHeader
          eyebrow="Community"
          title={
            <>
              Guardians of the <span className="font-display italic font-normal text-gradient-brand">street</span>
            </>
          }
          description="Every report gets an animal one step closer to care. These citizens have done it most."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="flex items-center gap-4 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-success/15 text-success">
              <HeartHandshake className="size-5" />
            </span>
            <div>
              <p className="font-medium">+50 karma</p>
              <p className="text-sm text-muted-foreground">for every report that ends in a rescue</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Megaphone className="size-5" />
            </span>
            <div>
              <p className="font-medium">+10 karma</p>
              <p className="text-sm text-muted-foreground">for every genuine report you send</p>
            </div>
          </Card>
        </div>

        {leaders === null ? (
          <EmptyState icon={Trophy} title="The leaderboard is taking a breather" description="We couldn't load rankings right now. Please refresh in a moment." />
        ) : leaders.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No rescuers yet"
            description="Be the first name on the board."
            action={
              <Button asChild>
                <Link href="/report">Report a rescue</Link>
              </Button>
            }
          />
        ) : (
          <>
            <Podium leaders={leaders.slice(0, 3)} />
            <RankTable leaders={leaders} />
          </>
        )}
      </div>
    </div>
  );
}
