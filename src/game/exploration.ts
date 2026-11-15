// Percent coordinates match the creators' labelled map, at each building entrance.
export const STATIONS = [
  { id: "wires", x: 49, y: 33 },
  { id: "code", x: 60, y: 71 },
  { id: "antenna", x: 66, y: 33 },
  { id: "solar", x: 19, y: 80 },
  { id: "rock", x: 88, y: 22 },
  { id: "water", x: 34, y: 43 },
  { id: "route", x: 49, y: 57 },
  { id: "suit", x: 39, y: 70 },
  { id: "samples", x: 66, y: 50 },
] as const;
export type Position = { x: number; y: number };
export function moveExplorer(p: Position, dx: number, dy: number): Position {
  return { x: Math.max(3, Math.min(97, p.x + dx)), y: Math.max(4, Math.min(94, p.y + dy)) };
}
export function nearbyStation(p: Position): string | undefined {
  return STATIONS.find((s) => Math.hypot((s.x - p.x) * 1.77, s.y - p.y) <= 5)?.id;
}
export function canEnterStation(
  p: Position,
  id: string,
  attempts: number,
  completed: string[],
): boolean {
  return nearbyStation(p) === id && attempts < 3 && !completed.includes(id);
}
