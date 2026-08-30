import { describe, expect, it } from "vitest";
import { DEMO_STORAGE_KEY, formatTime, nextReview, REAL_STORAGE_KEY } from "../app/src/store";
import type { Session } from "../app/src/types";

describe("review queue", () => {
  it("caps a review at five learner pins and prioritizes unreviewed pins", () => {
    const session = { pins: Array.from({ length: 8 }, (_, index) => ({ id: `${index}`, segmentId: `${index}`, note: `Q${index}`, createdAt: `2026-08-${10 + index}T00:00:00Z`, reviewedAt: index < 2 ? `2026-08-${20 + index}T00:00:00Z` : undefined })) } as Session;
    const queue = nextReview(session);
    expect(queue).toHaveLength(5);
    expect(queue.map((pin) => pin.id)).toEqual(["2", "3", "4", "5", "6"]);
  });
  it("formats stable minute timecodes", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(125.9)).toBe("02:05");
    expect(formatTime(-2)).toBe("00:00");
  });

  it("uses visibly separate storage names for real and demo sessions", () => {
    expect(DEMO_STORAGE_KEY).toMatch(/^demo:/);
    expect(DEMO_STORAGE_KEY).not.toBe(REAL_STORAGE_KEY);
  });
});
