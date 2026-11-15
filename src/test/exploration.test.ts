import { describe, it, expect } from "vitest";
import { canEnterStation, nearbyStation, STATIONS } from "@/game/exploration";
describe("Proximity exploration", () => {
  it("does not open a mission far from the explorer", () => {
    expect(canEnterStation({ x: 10, y: 10 }, "wires", 0, [])).toBe(false);
  });
  it("opens the energy mission after reaching its entrance and interacting", () => {
    expect(canEnterStation({ x: 49, y: 33 }, "wires", 0, [])).toBe(true);
  });
  it("respects the three-attempt limit", () => {
    expect(canEnterStation({ x: 49, y: 33 }, "wires", 3, [])).toBe(false);
  });
  it("does not repeat a completed mission", () => {
    expect(canEnterStation({ x: 49, y: 33 }, "wires", 0, ["wires"])).toBe(false);
  });
  it("each location corresponds to its own mission", () => {
    expect(STATIONS.map((s) => nearbyStation(s))).toEqual([
      "wires",
      "code",
      "antenna",
      "solar",
      "rock",
      "water",
      "route",
      "suit",
      "samples",
    ]);
  });
});
