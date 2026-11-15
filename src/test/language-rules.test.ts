import { describe, expect, it } from "vitest";
import { contentForLanguage, DEFAULT_LANGUAGE } from "@/game/language";
import { STAT_KEYS } from "@/game/rules";
import { missionScenes, cutsceneForLanguage } from "@/game/art";
import englishVideo from "@/assets/mars/arrival-english.mp4.asset.json";
import portugueseVideo from "@/assets/mars/arrival-cutscene.mp4.asset.json";

describe("Bilingual session rules", () => {
  it("starts a new session in English", () => {
    expect(DEFAULT_LANGUAGE).toBe("en");
  });
  it("plays the uploaded English video in English", () => {
    expect(cutsceneForLanguage("en")).toBe(englishVideo.url);
    expect(cutsceneForLanguage("en")).not.toBe(portugueseVideo.url);
  });
  it("preserves the original video in Portuguese", () => {
    expect(cutsceneForLanguage("pt")).toBe(portugueseVideo.url);
  });
  it("keeps the first decision at energy +10 and health -2 in both languages", () => {
    for (const language of ["en", "pt"] as const) {
      expect(contentForLanguage(language).days[0]?.choices[0]?.fx).toEqual({
        energy: 10,
        health: -2,
      });
    }
  });
  it("keeps all decision effects, emergency deadlines and rewards identical between languages", () => {
    const english = contentForLanguage("en");
    const portuguese = contentForLanguage("pt");
    expect(portuguese.days.map((day) => day.choices.map((choice) => choice.fx))).toEqual(
      english.days.map((day) => day.choices.map((choice) => choice.fx)),
    );
    expect(portuguese.emergencies.map((event) => event.time)).toEqual([45, 30, 40]);
    expect(portuguese.tasks.map((task) => task.reward)).toEqual(
      english.tasks.map((task) => task.reward),
    );
  });
  it("uses English identifiers for all six indicators", () => {
    expect(STAT_KEYS).toEqual(["oxygen", "water", "food", "energy", "radiation", "health"]);
  });
  it("assigns a separate uploaded room to each of the nine missions", () => {
    const tasks = contentForLanguage("en").tasks;
    expect(tasks.map((task) => missionScenes[task.id])).toHaveLength(9);
    expect(new Set(tasks.map((task) => missionScenes[task.id])).size).toBe(9);
    expect(tasks.every((task) => Boolean(missionScenes[task.id]))).toBe(true);
  });
});
