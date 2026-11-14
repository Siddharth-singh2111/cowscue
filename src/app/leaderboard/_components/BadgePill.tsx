import { Award, Heart, Shield, Star } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { Badge } from "@/components/ui/badge";

const STYLE: Record<LeaderboardEntry["badge"], { variant: "default" | "success" | "routine" | "secondary"; icon: typeof Award }> = {
  Guardian: { variant: "default", icon: Award },
  Protector: { variant: "success", icon: Shield },
  Rescuer: { variant: "routine", icon: Star },
  Helper: { variant: "secondary", icon: Heart },
};

export function BadgePill({ badge }: { badge: LeaderboardEntry["badge"] }) {
  const { variant, icon: Icon } = STYLE[badge];
  return (
    <Badge variant={variant}>
      <Icon /> {badge}
    </Badge>
  );
}
