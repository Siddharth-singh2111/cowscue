import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { toOpsReport, toPublicReport } from "@/server/services/serializers";
import type { IReport } from "@/server/models/Report";

function makeReport(overrides: Partial<IReport> = {}): IReport {
  return {
    _id: new Types.ObjectId(),
    reporterId: "user_1",
    reporterName: "Asha Rao",
    reporterPhone: "+919876543210",
    reporterHistory: 2,
    channel: "web",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/cow.jpg",
    description: "Injured calf near the market",
    location: { type: "Point", coordinates: [79.99, 13.55] },
    status: "en_route",
    severity: "CRITICAL",
    injuryType: "leg wound",
    firstAid: ["Keep distance"],
    ngoUserId: "ngo_user",
    ngoName: "Gau Seva Trust",
    driverName: "Ramesh",
    driverPhone: "+919811111111",
    driverLatitude: 13.56,
    driverLongitude: 79.98,
    escalationLevel: 0,
    notifiedNgoIds: [],
    duplicateCount: 0,
    isFundraising: false,
    fundraisingGoal: 0,
    fundraisingRaised: 0,
    donorCount: 0,
    timeline: [{ type: "reported", at: new Date(), message: "Reported" }],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as IReport;
}

describe("report DTOs", () => {
  it("never exposes phone numbers in the public view", () => {
    const json = JSON.stringify(toPublicReport(makeReport()));
    expect(json).not.toContain("9876543210");
    expect(json).not.toContain("9811111111");
    expect(json).not.toContain("reporterPhone");
  });

  it("maps GeoJSON [lng, lat] to {lat, lng}", () => {
    const dto = toPublicReport(makeReport());
    expect(dto.location).toEqual({ lat: 13.55, lng: 79.99 });
    expect(dto.driver).toMatchObject({ lat: 13.56, lng: 79.98 });
  });

  it("hides the driver position once the case is resolved", () => {
    expect(toPublicReport(makeReport({ status: "resolved" })).driver).toBeUndefined();
  });

  it("includes contact details and ownership for responders", () => {
    const ops = toOpsReport(makeReport(), { userId: "ngo_user", lat: 13.55, lng: 79.99 });
    expect(ops.reporterPhone).toBe("+919876543210");
    expect(ops.isMine).toBe(true);
    expect(ops.distanceKm).toBe(0);
    expect(toOpsReport(makeReport(), { userId: "someone_else" }).isMine).toBe(false);
  });
});
