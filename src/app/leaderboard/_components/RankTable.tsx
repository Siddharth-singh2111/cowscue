import type { LeaderboardEntry } from "@/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BadgePill } from "./BadgePill";

export function RankTable({ leaders }: { leaders: LeaderboardEntry[] }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <caption className="sr-only">Citizen leaderboard</caption>
        <thead className="border-b bg-subtle text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="w-14 px-4 py-3 font-medium">
              #
            </th>
            <th scope="col" className="px-2 py-3 font-medium">
              Citizen
            </th>
            <th scope="col" className="hidden px-2 py-3 text-right font-medium sm:table-cell">
              Rescues
            </th>
            <th scope="col" className="hidden px-2 py-3 text-right font-medium sm:table-cell">
              Reports
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Karma
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {leaders.map((l) => (
            <tr key={l.id} className={cn("transition-colors hover:bg-accent/50", l.rank <= 3 && "bg-primary-soft/20")}>
              <td className="px-4 py-3 font-medium tabular-nums text-muted-foreground">{l.rank}</td>
              <td className="px-2 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="font-medium">{l.name}</span>
                  <BadgePill badge={l.badge} />
                </div>
                <span className="text-xs text-muted-foreground sm:hidden">
                  {l.rescues} rescues · {l.reports} reports
                </span>
              </td>
              <td className="hidden px-2 py-3 text-right tabular-nums sm:table-cell">{l.rescues}</td>
              <td className="hidden px-2 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">{l.reports}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{l.karma.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
