import { describe, expect, it } from "vitest";
import { musicForScreen, DEFAULT_VOLUME } from "@/game/music";

describe("soundtrack", () => {
  it("plays the home song only on the start screen and nothing during the video", () => {
    expect(musicForScreen("intro", false)).toBe("home");
    expect(musicForScreen("cutscene", false)).toBeNull();
  });
  it("plays the main song in the ship and on the map", () => {
    for (const s of ["select", "team", "day", "result", "night", "explore", "task", "taskResult"])
      expect(musicForScreen(s, false)).toBe("main");
  });
  it("swaps to the emergency song only during an emergency", () => {
    expect(musicForScreen("emergency", false)).toBe("emergency");
  });
  it("uses the final song for a completed mission and the interrupted song otherwise", () => {
    expect(musicForScreen("end", false)).toBe("final");
    expect(musicForScreen("credits", false)).toBe("final");
    expect(musicForScreen("end", true)).toBe("interrupted");
    expect(musicForScreen("credits", true)).toBe("interrupted");
  });
  it("starts at a medium volume", () => {
    expect(DEFAULT_VOLUME).toBe(0.5);
  });
});
