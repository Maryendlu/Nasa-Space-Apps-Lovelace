export type Direction = "down" | "left" | "right" | "up";
export const DIRECTION_ROWS: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
export function movementDirection(dx: number, dy: number, last: Direction): Direction {
  if (!dx && !dy) return last;
  return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
}
export function movementFrame(elapsed: number, moving: boolean): number {
  return moving ? Math.floor(elapsed / 125) % 4 : 1;
}
