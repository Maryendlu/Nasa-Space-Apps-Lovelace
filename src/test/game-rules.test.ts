import { describe, expect, it } from "vitest";
import content from "@/game/content.json";
import {
  advanceDay,
  applyEffects,
  canAttempt,
  consumeItem,
  criticalFailure,
  emergencyExpired,
  initialStats,
  radiationEffects,
  selectEmergencyNights,
} from "@/game/rules";
import { flareRisk } from "@/game/donki";

describe("Mars Academy script rules", () => {
  it("starts all six indicators at 70", () => {
    expect(Object.values(initialStats())).toEqual([70, 70, 70, 70, 70, 70]);
  });
  it("clamps resources between zero and one hundred", () => {
    expect(applyEffects(initialStats(), { water: 80, energy: -90 })).toMatchObject({
      water: 100,
      energy: 0,
    });
  });
  it("never erases accumulated radiation", () => {
    expect(applyEffects(initialStats(), { radiation: -30 }).radiation).toBe(70);
  });
  for (const key of ["oxygen", "water", "food", "energy", "health"] as const)
    it(`stops when ${key} reaches zero`, () => {
      expect(criticalFailure({ ...initialStats(), [key]: 0 })).toBe(key);
    });
  it("interrupts at 100 percent radiation but not 99", () => {
    expect(criticalFailure({ ...initialStats(), radiation: 100 })).toBe("radiation");
    expect(criticalFailure({ ...initialStats(), radiation: 99 })).toBeUndefined();
  });
  it("does not treat zero radiation as depleted resources", () => {
    expect(criticalFailure({ ...initialStats(), radiation: 0 })).toBeUndefined();
  });
  it("detects depleted energy immediately after a decision", () => {
    expect(criticalFailure(applyEffects(initialStats(), { energy: -70 }))).toBe("energy");
  });
  it("detects radiation reaching 100 after the daily adjustment", () => {
    expect(criticalFailure(advanceDay({ ...initialStats(), radiation: 99 }, true))).toBe(
      "radiation",
    );
  });
  it("zero food reduces health by five per day", () => {
    expect(advanceDay({ ...initialStats(), food: 0 }, false).health).toBe(65);
  });
  it("zero energy reduces health by three per day", () => {
    expect(advanceDay({ ...initialStats(), energy: 0 }, false).health).toBe(67);
  });
  it("applies all six optional daily adjustments", () => {
    expect(advanceDay(initialStats(), true)).toEqual({
      oxygen: 71,
      water: 71,
      food: 69,
      energy: 72,
      radiation: 71,
      health: 71,
    });
  });
  it("skips daily adjustment when disabled", () => {
    expect(advanceDay(initialStats(), false)).toEqual(initialStats());
  });
  it("never recovers health after it reaches zero", () => {
    expect(advanceDay({ ...initialStats(), food: 0, health: 4 }, true).health).toBe(0);
  });
  it("draws exactly three distinct nights before the final day", () => {
    const n = selectEmergencyNights(() => 0.45);
    expect(n.length).toBe(3);
    expect(new Set(n).size).toBe(3);
    expect(n.every((d) => d >= 1 && d <= 9)).toBe(true);
  });
  it("does not fix the draw to the original nights", () => {
    expect(selectEmergencyNights(() => 0)).not.toEqual(selectEmergencyNights(() => 0.99));
  });
  it("loses immediately when the deadline expires", () => {
    expect(emergencyExpired(45000, 45000)).toBe(true);
    expect(emergencyExpired(45000, 44999)).toBe(false);
  });
  it("allows up to three attempts per night", () => {
    expect(canAttempt(2)).toBe(true);
    expect(canAttempt(3)).toBe(false);
  });
  it("uses an item once with a gain of ten energy", () => {
    const result = consumeItem(initialStats(), [{ energy: 10 }], 0);
    expect(result.stats.energy).toBe(80);
    expect(result.items).toEqual([]);
    expect(consumeItem(result.stats, result.items, 0).stats.energy).toBe(80);
  });
  it("adds three radiation per risk level to exposed choices", () => {
    expect(radiationEffects({ radiation: 15 }, 3).radiation).toBe(24);
    expect(radiationEffects({ radiation: 2 }, 3).radiation).toBe(2);
  });
  it("classifies the four space-weather risk levels", () => {
    expect(["A1", "C4", "M2", "X1"].map(flareRisk)).toEqual([0, 1, 2, 3]);
  });
  it("preserves ten days and three choices per day", () => {
    expect(content.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(content.days.map((d) => d.choices.length)).toEqual(Array(10).fill(3));
  });
  it("preserves the first scripted decision effects", () => {
    expect(content.days[0]?.choices[0]?.fx).toEqual({ energy: 10, health: -2 });
  });
  it("preserves the three emergency deadlines", () => {
    expect(content.emergencies.map((e) => e.time)).toEqual([45, 30, 40]);
  });
  it("preserves nine tasks and their rewards", () => {
    expect(content.tasks.length).toBe(9);
    expect(content.tasks.map((t) => t.reward)).toEqual([
      { energy: 10 },
      { oxygen: 10 },
      { energy: 5 },
      { energy: 15 },
      { health: 3 },
      { water: 10 },
      { food: 5 },
      { health: 10 },
      { health: 5 },
    ]);
  });
});
