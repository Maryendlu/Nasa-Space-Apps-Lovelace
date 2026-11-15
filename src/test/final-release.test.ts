import { describe, expect, it } from "vitest";
import content from "@/game/content.json";
import { loadSpaceWeather } from "@/game/donki";
import { DIRECTION_ROWS, movementDirection, movementFrame } from "@/game/motion";
import {
  advanceDay,
  applyEffects,
  criticalFailure,
  initialStats,
  missionOutcome,
  radiationEffects,
} from "@/game/rules";

function simulate(choices: number[], emergencies: number[], adjustment: boolean) {
  let stats = initialStats();
  for (const [index, day] of content.days.entries()) {
    const choice = day.choices[choices[index] ?? 0];
    if (!choice) throw new Error("Missing choice");
    stats = applyEffects(stats, index === 1 ? radiationEffects(choice.fx, 3) : choice.fx);
    if (criticalFailure(stats)) return { stats, stopped: index + 1 };
    const event = [2, 5, 8].indexOf(index + 1);
    if (event >= 0) {
      const choice = content.emergencies[event]?.choices[emergencies[event] ?? 0];
      if (!choice) throw new Error("Missing emergency choice");
      stats = applyEffects(stats, choice.fx);
      if (criticalFailure(stats)) return { stats, stopped: index + 1 };
    }
    if (index < 9) stats = advanceDay(stats, adjustment);
    if (criticalFailure(stats)) return { stats, stopped: index + 1 };
  }
  return { stats, stopped: null };
}
describe("Final release rules", () => {
  it("uses all four supplied direction rows", () => {
    expect(DIRECTION_ROWS).toEqual({ down: 0, left: 1, right: 2, up: 3 });
    expect(
      [
        [0, 1],
        [-1, 0],
        [1, 0],
        [0, -1],
      ].map(([x = 0, y = 0]) => movementDirection(x, y, "down")),
    ).toEqual(["down", "left", "right", "up"]);
  });
  it("cycles four frames at eight fps", () => {
    expect([0, 125, 250, 375, 500].map((time) => movementFrame(time, true))).toEqual([
      0, 1, 2, 3, 0,
    ]);
  });
  it("stands on the second column with the last direction", () => {
    expect(movementFrame(999, true)).toBe(3);
    expect(movementFrame(999, false)).toBe(1);
    expect(movementDirection(0, 0, "up")).toBe("up");
  });
  it("can survive ten days without side missions with daily adjustments", () => {
    const result = simulate([2, 2, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0], true);
    expect(result.stopped).toBeNull();
    expect(result.stats).toEqual({
      oxygen: 64,
      water: 62,
      food: 67,
      energy: 53,
      radiation: 79,
      health: 97,
    });
    expect(missionOutcome(result.stats)).toBe("accomplished");
  });
  it("can survive with difficulties using different daily decisions", () => {
    const result = simulate([2, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0], true);
    expect(result.stopped).toBeNull();
    expect(result.stats.radiation).toBe(81);
    expect(missionOutcome(result.stats)).toBe("difficulties");
  });
  it("can accomplish the mission with adjustments disabled", () => {
    const result = simulate([2, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0], false);
    expect(result.stopped).toBeNull();
    expect(result.stats.radiation).toBe(72);
    expect(missionOutcome(result.stats)).toBe("accomplished");
  });
  it("stops unsafe choices rather than always showing difficulties", () => {
    const result = simulate(Array(10).fill(1), [1, 1, 1], true);
    expect(result.stopped).not.toBeNull();
    expect(missionOutcome(result.stats)).toBe("interrupted");
  });
});
const events: Record<string, unknown[]> = {
  FLR: [{ flrID: "test-flare", classType: "M3.5" }],
  CME: [{ activityID: "test-cme" }],
  GST: [{ gstID: "test-storm" }],
};
function fetchExample(failed = "", invalid = false): typeof fetch {
  return async (url) => {
    const endpoint = String(url).split("/").pop()?.split("?")[0] ?? "";
    return new Response(JSON.stringify(invalid ? { error: "invalid" } : events[endpoint]), {
      status: endpoint === failed ? 503 : 200,
    });
  };
}
describe("Truthful DONKI integration", () => {
  it("reads real-shaped records in a thirty-day UTC window", async () => {
    const result = await loadSpaceWeather(fetchExample(), new Date("2026-11-15T14:31:00Z"));
    expect(result).toMatchObject({
      start: "2026-10-16",
      end: "2026-11-15",
      strongest: "M3.5",
      risk: 2,
      cmes: 1,
      storms: 1,
      unavailable: [],
      offline: false,
    });
  });
  it("keeps successful CME and GST reads when FLR fails", async () => {
    expect(await loadSpaceWeather(fetchExample("FLR"))).toMatchObject({
      strongest: null,
      risk: 2,
      cmes: 1,
      storms: 1,
      unavailable: ["FLR"],
      offline: false,
    });
  });
  it("does not invent zero storms when GST fails", async () => {
    expect(await loadSpaceWeather(fetchExample("GST"))).toMatchObject({
      strongest: "M3.5",
      storms: null,
      unavailable: ["GST"],
    });
  });
  it("rejects malformed responses instead of presenting observed data", async () => {
    expect(await loadSpaceWeather(fetchExample("", true))).toMatchObject({
      strongest: null,
      cmes: null,
      storms: null,
      offline: true,
      unavailable: ["FLR", "CME", "GST"],
    });
  });
  it("treats valid empty arrays as no recorded events, not an outage", async () => {
    const empty: typeof fetch = async () => new Response("[]");
    expect(await loadSpaceWeather(empty)).toMatchObject({
      strongest: "None",
      risk: 0,
      cmes: 0,
      storms: 0,
      offline: false,
    });
  });
});
