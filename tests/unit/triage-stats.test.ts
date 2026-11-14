import { describe, expect, it } from "vitest";
import { heuristicTriage } from "@/server/services/triage";
import { badgeFor, median } from "@/server/services/stats";

describe("heuristic triage fallback", () => {
  it.each([
    ["Cow hit by a car and bleeding heavily", "CRITICAL"],
    ["The bull cannot stand up", "CRITICAL"],
    ["Calf is limping with a small wound", "MODERATE"],
    ["Stray cow looks hungry", "ROUTINE"],
  ])("%s → %s", (text, expected) => {
    const t = heuristicTriage(text);
    expect(t.severity).toBe(expected);
    expect(t.source).toBe("fallback");
    expect(t.isCattle).toBe(true);
    expect(t.firstAid.length).toBeGreaterThan(0);
  });
});

describe("stats helpers", () => {
  it("computes medians", () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([1, 2, 3, 10])).toBe(3);
  });

  it("assigns karma badges by rescues", () => {
    expect(badgeFor(0)).toBe("Helper");
    expect(badgeFor(3)).toBe("Rescuer");
    expect(badgeFor(10)).toBe("Protector");
    expect(badgeFor(40)).toBe("Guardian");
  });
});
