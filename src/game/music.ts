// Pure soundtrack selection: exactly one track (or none) per screen, never mixed.
export type MusicTrack = "home" | "main" | "final" | "emergency" | "interrupted";
export const DEFAULT_VOLUME = 0.5;
export function musicForScreen(screen: string, interrupted: boolean): MusicTrack | null {
  if (screen === "intro") return "home";
  // The arrival video carries its own soundtrack.
  if (screen === "cutscene") return null;
  if (screen === "emergency") return "emergency";
  if (screen === "end" || screen === "credits") return interrupted ? "interrupted" : "final";
  return "main";
}
