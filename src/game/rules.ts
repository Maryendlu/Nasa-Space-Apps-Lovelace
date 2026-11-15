// Pure game rules kept separate from presentation for review and testing.
export const STAT_KEYS = ["oxygen", "water", "food", "energy", "radiation", "health"] as const;
export type Stat = (typeof STAT_KEYS)[number];
export type Stats = Record<Stat, number>;
export type Effects = Partial<Stats>;
export const LABELS: Record<Stat, string> = {
  oxygen: "Oxygen",
  water: "Water",
  food: "Food",
  energy: "Energy",
  radiation: "Radiation",
  health: "Health",
};
export const DAILY: Effects = {
  oxygen: 1,
  water: 1,
  food: -1,
  energy: 2,
  radiation: 1,
  health: 1,
};
export const MAX_TASKS = 3;
export function initialStats(): Stats {
  return { oxygen: 70, water: 70, food: 70, energy: 70, radiation: 70, health: 70 };
}
export function applyEffects(stats: Stats, effects: Effects): Stats {
  const next = { ...stats };
  for (const key of STAT_KEYS) {
    const change = effects[key] ?? 0;
    // Accumulated radiation cannot be erased by a reward.
    next[key] = Math.max(
      0,
      Math.min(100, stats[key] + (key === "radiation" ? Math.max(0, change) : change)),
    );
  }
  return next;
}
export function advanceDay(stats: Stats, adjustment: boolean): Stats {
  const penalty = (stats.food === 0 ? 5 : 0) + (stats.energy === 0 ? 3 : 0);
  const next = applyEffects(stats, { health: -penalty });
  if (criticalFailure(next)) return next;
  return adjustment ? applyEffects(next, DAILY) : next;
}
export function criticalFailure(stats: Stats): Stat | undefined {
  return STAT_KEYS.find((key) => (key === "radiation" ? stats[key] >= 100 : stats[key] <= 0));
}
export function indicatorsAtRisk(stats: Stats): Stat[] {
  return STAT_KEYS.filter((key) => (key === "radiation" ? stats[key] >= 80 : stats[key] <= 25));
}
export function missionOutcome(
  stats: Stats,
  timedOut = false,
): "interrupted" | "difficulties" | "accomplished" {
  if (timedOut || criticalFailure(stats)) return "interrupted";
  return indicatorsAtRisk(stats).length ? "difficulties" : "accomplished";
}
export function selectEmergencyNights(random: () => number = Math.random): number[] {
  const nights = Array.from({ length: 9 }, (_, i) => i + 1);
  for (let i = nights.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = nights[i];
    const b = nights[j];
    if (a !== undefined && b !== undefined) {
      nights[i] = b;
      nights[j] = a;
    }
  }
  return nights.slice(0, 3).sort((a, b) => a - b);
}
export function radiationEffects(effects: Effects, risk: number): Effects {
  return (effects.radiation ?? 0) >= 10
    ? { ...effects, radiation: (effects.radiation ?? 0) + risk * 3 }
    : effects;
}
export function emergencyExpired(deadline: number, now: number): boolean {
  return now >= deadline;
}
export function canAttempt(attempts: number): boolean {
  return attempts < MAX_TASKS;
}
export function consumeItem(
  stats: Stats,
  items: Effects[],
  index: number,
): { stats: Stats; items: Effects[] } {
  const item = items[index];
  if (!item) return { stats, items };
  return { stats: applyEffects(stats, item), items: items.filter((_, i) => i !== index) };
}
