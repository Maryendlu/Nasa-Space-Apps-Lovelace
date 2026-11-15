import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Backpack,
  BookOpen,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Droplets,
  Heart,
  Leaf,
  Maximize,
  Minimize,
  Target,
  Languages,
  Moon,
  HelpCircle,
  X,
  Play,
  Radiation,
  Rocket,
  Shield,
  Utensils,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameLanguageProvider, useGameLanguage } from "./language";
import {
  portraits,
  cabinUrl,
  worldUrl,
  cutsceneForLanguage,
  missionScenes,
  logoUrl,
  homeVideoUrl,
  creditsBackgroundUrl,
  musicTracks,
} from "./art";
import { musicForScreen, DEFAULT_VOLUME } from "./music";
import { Transmission } from "./Transmission";
import { BaseMap } from "./BaseMap";
import { Minigame } from "./Minigame";
import { loadSpaceWeather, DONKI_REFERENCE, type Choice, type SpaceWeather } from "./donki";
import {
  advanceDay,
  applyEffects,
  canAttempt,
  consumeItem,
  criticalFailure,
  emergencyExpired,
  initialStats,
  indicatorsAtRisk,
  missionOutcome,
  LABELS,
  radiationEffects,
  selectEmergencyNights,
  STAT_KEYS,
  type Effects,
  type Stat,
  type Stats,
} from "./rules";

type Screen =
  | "cutscene"
  | "explore"
  | "intro"
  | "select"
  | "team"
  | "day"
  | "result"
  | "night"
  | "emergency"
  | "task"
  | "taskResult"
  | "end"
  | "credits";
type Journal = { day: number; title: string; choice: string; why: string; fx: Effects };
type Item = { name: string; fx: Effects };
const ICONS = {
  oxygen: Shield,
  water: Droplets,
  food: Utensils,
  energy: Zap,
  radiation: Radiation,
  health: Heart,
};

function EffectsView({ effects }: { effects: Effects }) {
  const { t } = useGameLanguage();
  return (
    <div className="effects">
      {STAT_KEYS.filter((k) => effects[k] !== undefined).map((k) => {
        const delta = effects[k] ?? 0;
        const good = k === "radiation" ? delta <= 0 : delta >= 0;
        const Icon = ICONS[k];
        return (
          <span className={good ? "effect gain" : "effect loss"} key={k}>
            <Icon />
            {t(LABELS[k])} {delta > 0 ? "+" : ""}
            {delta}
          </span>
        );
      })}
    </div>
  );
}
function Source({ index }: { index: number }) {
  const { content } = useGameLanguage();
  const source = content.sources[index];
  return source ? (
    <a className="science-source" href={source.url} target="_blank" rel="noreferrer">
      {source.title} ↗
    </a>
  ) : null;
}
function Dialogue({ npc, children }: { npc: string; children: React.ReactNode }) {
  const { content } = useGameLanguage();
  const person = content.npcs[npc as keyof typeof content.npcs];
  return (
    <div className="dialogue">
      <img src={portraits[npc]} alt={person?.name ?? npc} />
      <div>
        <span className="dialogue-name">
          {person?.name}
          <small>{person?.role}</small>
        </span>
        <div className="dialogue-text">{children}</div>
      </div>
    </div>
  );
}

export function MarsAcademy() {
  return (
    <GameLanguageProvider>
      <GameScreen />
    </GameLanguageProvider>
  );
}
function GameScreen() {
  const { t, content, language, setLanguage } = useGameLanguage();
  const NPCS = content.npcs;
  const [screen, setScreen] = useState<Screen>("intro");
  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  const [indicatorsOpen, setIndicatorsOpen] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [choicesReady, setChoicesReady] = useState(false);
  const [transition, setTransition] = useState<"dusk" | "dawn" | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoBlocked, setVideoBlocked] = useState(false);
  const [player, setPlayer] = useState("maya");
  const [day, setDay] = useState(1);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [adjustment, setAdjustment] = useState(true);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [objectiveOpen, setObjectiveOpen] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [nights, setNights] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [journal, setJournal] = useState<Journal[]>([]);
  const [weather, setWeather] = useState<SpaceWeather | null>(null);
  const [result, setResult] = useState<{ choice: Choice; emergency: boolean } | null>(null);
  const [taskId, setTaskId] = useState("");
  const [won, setWon] = useState(false);
  const [failure, setFailure] = useState<Stat | "timeout" | null>(null);
  const [time, setTime] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [toast, setToast] = useState("");
  const [diaryOpen, setDiaryOpen] = useState(false);
  const task = content.tasks.find((t) => t.id === taskId);
  const eventIndex = nights.indexOf(day);
  const emergency = content.emergencies[eventIndex];
  const currentDay = content.days[day - 1] ?? content.days[0];
  const active = !["intro", "select", "team", "credits", "cutscene"].includes(screen);
  const isNight =
    ["night", "explore", "task", "taskResult", "emergency"].includes(screen) ||
    (screen === "result" && Boolean(result?.emergency));
  const isWorld = ["explore", "task", "taskResult"].includes(screen);
  useEffect(() => {
    setChoicesReady(false);
    if (screen === "explore") setIndicatorsOpen(false);
    else if (screen === "day") setIndicatorsOpen(true);
  }, [screen, day]);
  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);
  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (screen !== "cutscene") return;
    const video = videoRef.current;
    if (video) void video.play().catch(() => setVideoBlocked(true));
  }, [screen]);
  const changeLight = (kind: "dusk" | "dawn", action: () => void) => {
    if (transitionTimer.current) return;
    setTransition(kind);
    transitionTimer.current = setTimeout(() => {
      action();
      setTransition(null);
      transitionTimer.current = null;
    }, 1100);
  };
  const timeoutEnd = () => {
    setFailure("timeout");
    setScreen("end");
  };
  useEffect(() => {
    if (screen !== "emergency") return;
    const timer = setInterval(() => {
      const now = Date.now();
      setTime(Math.max(0, Math.ceil((deadline - now) / 1000)));
      if (emergencyExpired(deadline, now)) timeoutEnd();
    }, 100);
    return () => clearInterval(timer);
  }, [screen, deadline]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const track = musicForScreen(screen, Boolean(failure));
  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    if (!track) {
      audio.pause();
      return;
    }
    const url = musicTracks[track];
    if (!audio.src.endsWith(url)) {
      audio.src = url;
      audio.currentTime = 0;
    }
    void audio.play().catch(() => undefined);
  }, [track]);
  useEffect(() => {
    // Browsers only allow sound after the player interacts; retry on the first input.
    const resume = () => {
      const audio = musicRef.current;
      if (audio && audio.src && audio.paused && musicForScreen(screenRef.current, false))
        void audio.play().catch(() => undefined);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);
  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFullscreen = () => {
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (root.requestFullscreen) void root.requestFullscreen().catch(() => undefined);
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    else setToast(t("Full screen is not supported by this browser."));
  };
  if (!currentDay) return null;
  const start = () => {
    setDay(1);
    setStats(initialStats());
    setInventory([]);
    setJournal([]);
    setCompleted([]);
    setTotalCompleted(0);
    setAttempts(0);
    setFailure(null);
    setResult(null);
    setInventoryOpen(false);
    setNights(selectEmergencyNights());
    setWeather(null);
    setVideoBlocked(false);
    setScreen("cutscene");
    void loadSpaceWeather().then(setWeather);
  };
  const returnToStart = () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
    setTransition(null);
    setTutorialOpen(false);
    setObjectiveOpen(false);
    setDiaryOpen(false);
    setInventoryOpen(false);
    setToast("");
    setScreen("intro");
    window.scrollTo({ top: 0 });
  };
  const choose = (choice: Choice, isEmergency: boolean) => {
    if (isEmergency && emergencyExpired(deadline, Date.now())) {
      timeoutEnd();
      return;
    }
    const fx =
      day === 2 && !isEmergency ? radiationEffects(choice.fx, weather?.risk ?? 2) : choice.fx;
    const resolved = { ...choice, fx };
    const next = applyEffects(stats, fx);
    setStats(next);
    setJournal((j) => [
      ...j,
      {
        day,
        title: isEmergency ? (emergency?.title ?? "") : currentDay.title,
        choice: choice.label,
        why: choice.why,
        fx,
      },
    ]);
    setResult({ choice: resolved, emergency: isEmergency });
    const failed = criticalFailure(next);
    if (failed) {
      setFailure(failed);
      setScreen("end");
    } else setScreen("result");
  };
  const goNight = () => {
    setAttempts(0);
    setCompleted([]);
    if (emergency) {
      const end = Date.now() + emergency.time * 1000;
      setDeadline(end);
      setTime(emergency.time);
      setScreen("emergency");
    } else setScreen("night");
  };
  const sleep = () => {
    const next = advanceDay(stats, adjustment);
    setStats(next);
    const failed = criticalFailure(next);
    if (failed) {
      setFailure(failed);
      setScreen("end");
      return;
    }
    setDay(day + 1);
    setScreen("day");
    setInventoryOpen(false);
  };
  const finishTask = (success: boolean) => {
    setWon(success);
    if (success && task) {
      setInventory((items) => [...items, { name: task.name, fx: task.reward }]);
      setCompleted((c) => [...c, task.id]);
      setTotalCompleted((n) => n + 1);
    }
    setScreen("taskResult");
  };
  const useItem = (index: number) => {
    if (screen !== "day") return;
    const next = consumeItem(
      stats,
      inventory.map((i) => i.fx),
      index,
    );
    setStats(next.stats);
    setInventory((items) => items.filter((_, i) => i !== index));
    const failed = criticalFailure(next.stats);
    if (failed) {
      setFailure(failed);
      setScreen("end");
      return;
    }
    setToast(t("Item used. The team’s resources have been updated."));
  };
  const timeoutScience =
    eventIndex === 0
      ? {
          text: t(
            "Air was escaping from the habitat. Pressure on Mars is much lower than on Earth, so we need a well-sealed base to keep air breathable. Without a decision in time, the team lacked sufficient protection.",
          ),
          source: 0,
        }
      : eventIndex === 1
        ? {
            text: t(
              "The fire damaged the systems that keep the base safe. Life support must control the air and remove contaminants. Without a response in time, the team could not be protected.",
            ),
            source: 4,
          }
        : {
            text: t(
              "Used water at the base must be treated and quality-checked before consumption. The sensor detected contamination. Without a response in time, the system could not guarantee safe water for the team.",
            ),
            source: 4,
          };
  const explanation =
    failure === "timeout" ? timeoutScience : failure ? content.losses[failure] : null;
  const risky = indicatorsAtRisk(stats);
  return (
    <main
      className={`mars-app ${active ? "immersive" : ""} ${indicatorsOpen ? "indicators-open" : "indicators-closed"} ${screen === "end" ? "is-ending" : ""} ${isNight ? "is-night" : ""} ${isWorld ? "is-world" : ""} ${transition ? `light-${transition}` : ""} ${screen === "emergency" ? "emergency-active" : ""} ${screen === "intro" ? "is-home" : ""}`}
    >
      {active && (
        <div className="game-environment" aria-hidden="true">
          <img
            src={
              screen === "task" || screen === "taskResult"
                ? (missionScenes[taskId] ?? cabinUrl)
                : isWorld
                  ? worldUrl
                  : cabinUrl
            }
            alt=""
          />
        </div>
      )}
      {active && !isWorld && screen !== "end" && (
        <div className="cabin-crew" aria-hidden="true">
          {["andreas", "lina", "laika"].map((id) => (
            <img key={id} src={portraits[id]} alt="" />
          ))}
        </div>
      )}
      <header className="academy-header">
        <a href="/" className="academy-wordmark" aria-label={t("Mars Academy — home")}>
          <img className="academy-logo" src={logoUrl} alt="" />
          <span>
            MARS <b>ACADEMY</b>
          </span>
        </a>
        <span className="header-mission">
          {t("PROJECT NEW HORIZON")}
          <span> / </span> 2045
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Open tutorial")}
          title="Tutorial"
          onClick={() => setTutorialOpen(true)}
        >
          <HelpCircle />
        </Button>
      </header>
      <audio ref={musicRef} loop preload="auto" />
      <div className="game-controls">
        <Button
          variant="outline"
          size="icon"
          aria-label={t("Music volume")}
          title={t("Music volume")}
          aria-expanded={volumeOpen}
          onClick={() => setVolumeOpen((open) => !open)}
        >
          {volume === 0 ? <VolumeX /> : <Volume2 />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={fullscreen ? t("Exit full screen") : t("Full screen")}
          title={fullscreen ? t("Exit full screen") : t("Full screen")}
          onClick={toggleFullscreen}
        >
          {fullscreen ? <Minimize /> : <Maximize />}
        </Button>
        {volumeOpen && (
          <div className="volume-popover">
            <Button
              variant="ghost"
              size="icon"
              aria-label={volume === 0 ? t("Unmute music") : t("Mute music")}
              onClick={() => setVolume(volume === 0 ? DEFAULT_VOLUME : 0)}
            >
              {volume === 0 ? <VolumeX /> : <Volume2 />}
            </Button>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              aria-label={t("Music volume")}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
            />
          </div>
        )}
      </div>
      <span className={`ai-disclosure ${screen === "cutscene" ? "on-video" : ""}`}>
        {t("Created with AI assistance")}
      </span>
      {active && (
        <section className="hud" aria-label={t("Mission indicators")}>
          <div className="hud-day">
            <span>
              {screen === "night" ||
              screen === "explore" ||
              screen === "emergency" ||
              screen === "task" ||
              screen === "taskResult"
                ? t("NIGHT")
                : t("DAY")}
            </span>
            <strong>
              {String(day).padStart(2, "0")}
              <small>/10</small>
            </strong>
          </div>
          <div className="hud-resources">
            <Button
              variant="outline"
              className="hud-toggle"
              aria-expanded={indicatorsOpen}
              aria-controls="resource-indicators"
              title={t(indicatorsOpen ? "Collapse indicators" : "Expand indicators")}
              aria-label={t(indicatorsOpen ? "Collapse indicators" : "Expand indicators")}
              onClick={() => setIndicatorsOpen((open) => !open)}
            >
              <Zap />
              <span>{t("Resources")}</span>
              {indicatorsOpen ? <ChevronUp /> : <ChevronDown />}
            </Button>
            {indicatorsOpen && (
              <div id="resource-indicators">
                {STAT_KEYS.map((key) => {
                  const Icon = ICONS[key];
                  const danger = key === "radiation" ? stats[key] >= 80 : stats[key] <= 25;
                  return (
                    <div key={key} className={`hud-stat stat-${key} ${danger ? "at-risk" : ""}`}>
                      <div>
                        <Icon />
                        <span>{t(LABELS[key])}</span>
                        <strong>
                          {stats[key]}
                          <small>%</small>
                        </strong>
                      </div>
                      <progress value={stats[key]} max={100} aria-label={t(LABELS[key])} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
      <div className="game-content">
        {screen === "cutscene" && (
          <section className="cutscene-screen" aria-label={t("Arrival on Mars")}>
            <video
              ref={videoRef}
              src={cutsceneForLanguage(language)}
              controls
              playsInline
              preload="auto"
              onEnded={() => setScreen("select")}
            />
            {videoBlocked && (
              <Button
                className="cutscene-play"
                onClick={() => {
                  const v = videoRef.current;
                  if (v)
                    void v
                      .play()
                      .then(() => setVideoBlocked(false))
                      .catch(() => setVideoBlocked(true));
                }}
              >
                <Volume2 />
                {t("Play with sound")}
              </Button>
            )}
            <Button variant="outline" className="cutscene-skip" onClick={() => setScreen("select")}>
              {t("Skip video")}
              <ArrowRight />
            </Button>
          </section>
        )}
        {screen === "intro" && (
          <section className="home-screen">
            <video
              className="home-background"
              src={homeVideoUrl}
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
            <div className="home-menu">
              <Button className="home-button" onClick={start}>
                <Play fill="currentColor" />
                {t("Play")}
              </Button>
              <Button className="home-button" onClick={() => setTutorialOpen(true)}>
                <HelpCircle />
                Tutorial
              </Button>
              <Button
                className="home-button"
                aria-label={t("Change language")}
                onClick={() => setLanguage(language === "en" ? "pt" : "en")}
              >
                <Languages />
                {t("Language")}: {language === "en" ? "English" : "Português"}
              </Button>
              <Button className="home-button" onClick={() => setObjectiveOpen(true)}>
                <Target />
                {t("Objective")}
              </Button>
              <label className="adjustment-toggle">
                <input
                  type="checkbox"
                  checked={adjustment}
                  onChange={(e) => setAdjustment(e.target.checked)}
                />
                <span>{t("Daily resource adjustment")}</span>
              </label>
            </div>
            <div className="home-bottom">
              <p className="home-slogan">{t(content.finalMessage)}</p>
              <small>{t("For the best experience, we recommend Google Chrome.")}</small>
            </div>
          </section>
        )}
        {screen === "select" && (
          <section className="selection-screen">
            <span className="eyebrow">{t("NASA SIMULATION · PROJECT NEW HORIZON")}</span>
            <h1>{t("Choose your astronaut")}</h1>
            <p>{content.story[5]}</p>
            <div className="character-grid">
              {["maya", "milo"].map((id) => (
                <Button
                  key={id}
                  variant="ghost"
                  className={`character-choice ${player === id ? "chosen" : ""}`}
                  onClick={() => setPlayer(id)}
                  aria-pressed={player === id}
                >
                  <span className="character-number">{id === "maya" ? "01" : "02"}</span>
                  <img
                    src={portraits[id]}
                    alt={
                      id === "maya"
                        ? t("Maya, astronaut in a blue suit")
                        : t("Milo, astronaut in an orange suit")
                    }
                  />
                  <strong>{id === "maya" ? "Maya" : "Milo"}</strong>
                  <span>
                    {id === "maya"
                      ? t("Astronomy and natural sciences")
                      : t("Technology, robotics and exploration")}
                  </span>
                  <q>
                    {id === "maya"
                      ? t("There is no mystery science cannot help us unravel!")
                      : t("If there is a way to find out, I want to be the first to try!")}
                  </q>
                  <span className="selection-mark">
                    {player === id ? (
                      <>
                        <Check />
                        {t("Selected")}
                      </>
                    ) : (
                      t("Select")
                    )}
                  </span>
                </Button>
              ))}
            </div>
            <Button className="primary-action" onClick={() => setScreen("team")}>
              {t("Meet the team")}
              <ArrowRight />
            </Button>
          </section>
        )}
        {screen === "team" && (
          <section className="team-screen">
            <span className="eyebrow">{t("NEW HORIZON BASE")}</span>
            <h1>{t("Your team on Mars")}</h1>
            <div className="team-grid">
              {Object.entries(NPCS).map(([id, npc]) => (
                <div key={id} className="team-member">
                  <img src={portraits[id]} alt={npc.name} />
                  <h2>{npc.name}</h2>
                  <span>{npc.role}</span>
                  <p>“{npc.quote}”</p>
                </div>
              ))}
            </div>
            <Button className="primary-action" onClick={() => setScreen("day")}>
              {t("Begin Day 1")}
              <ArrowRight />
            </Button>
          </section>
        )}
        {screen === "day" && (
          <section className="day-screen">
            <div className="mission-banner">
              <span className="eyebrow">
                {t("DAY CHALLENGE")} {String(day).padStart(2, "0")}
              </span>
              <h1>{currentDay.title}</h1>
              <span className="mission-location">
                <MapLocation />
                {t("Habitat · New Horizon Base")}
              </span>
            </div>
            <Transmission
              key={day}
              npc={currentDay.npc}
              text={currentDay.situation}
              onReady={() => setChoicesReady(true)}
            />
            {day === 2 && (
              <div className="weather-report">
                <Radiation />
                <div>
                  <strong>{t("NASA DONKI · Space weather")}</strong>
                  {weather ? (
                    <>
                      <p>
                        {weather.offline
                          ? t("NASA unavailable — no observed data received.")
                          : weather.unavailable.length
                            ? t("Partial NASA DONKI data.")
                            : t("Live NASA DONKI data.")}
                      </p>
                      <p>
                        {t("Game risk:")}{" "}
                        {[t("Quiet"), t("Low"), t("Moderate"), t("High")][weather.risk]}
                        {t("· Flare:")}{" "}
                        {weather.strongest === null ? t("Unavailable") : t(weather.strongest)} ·
                        CMEs: {weather.cmes ?? t("Unavailable")} {t("· Earth geomagnetic storms:")}{" "}
                        {weather.storms ?? t("Unavailable")}
                      </p>
                      <small>
                        {weather.start} {t("to")} {weather.end}
                        {t("· Observed solar activity, not a local forecast for Mars.")}
                      </small>
                      {weather.unavailable.length > 0 && (
                        <p>
                          {t("Unavailable queries:")} {weather.unavailable.join(", ")}
                        </p>
                      )}
                      <p>
                        {t(
                          weather.strongest === null
                            ? "Moderate game risk is used because flare data is unavailable; this is not a NASA measurement."
                            : "Game risk is derived from flare class; exposed Day 2 choices add risk × 3 radiation points. These points are not NASA measurements.",
                        )}
                      </p>
                    </>
                  ) : (
                    <p>
                      {t(
                        "Contacting NASA. Until a response arrives, a moderate-risk example is used.",
                      )}
                    </p>
                  )}
                </div>
                <a href={DONKI_REFERENCE} target="_blank" rel="noreferrer">
                  {t("Verify NASA source")} ↗
                </a>
              </div>
            )}
            {choicesReady && (
              <>
                <div className="choice-heading">
                  <span>{t("What will the team decide?")}</span>
                  <span>{t("CHOOSE A, B OR C")}</span>
                </div>
                <div className="daily-choices">
                  {currentDay.choices.map((choice, i) => (
                    <Button
                      key={choice.label}
                      variant="outline"
                      className="decision-button"
                      onClick={() => choose(choice, false)}
                    >
                      <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                      <span>{choice.label.replace(/^[ABC] — /, "")}</span>
                      <ChevronRight />
                    </Button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
        {screen === "emergency" && emergency && (
          <section className="emergency-screen">
            <span className="eyebrow">{t("ALERT · HABITAT EMERGENCY")}</span>
            <div className="emergency-title">
              <h1>{emergency.title}</h1>
              <strong role="timer">
                {time}
                <small>{t("seconds")}</small>
              </strong>
            </div>
            <progress
              max={emergency.time}
              value={time}
              aria-label={t("Emergency time remaining")}
            />
            <Dialogue npc={emergency.npc}>
              <p>{emergency.situation}</p>
            </Dialogue>
            <div className="daily-choices">
              {emergency.choices.map((choice, i) => (
                <Button
                  key={choice.label}
                  variant="outline"
                  className="decision-button"
                  onClick={() => choose(choice, true)}
                >
                  <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                  <span>{choice.label.replace(/^[ABC] — /, "")}</span>
                  <ChevronRight />
                </Button>
              ))}
            </div>
          </section>
        )}
        {screen === "result" && result && (
          <section className="result-screen">
            <span className="eyebrow">
              {result.emergency
                ? t("EMERGENCY UNDER CONTROL")
                : t("MISSION JOURNAL · DAY {0}", [day])}
            </span>
            <h1>{t("Decision made")}</h1>
            <h2>{result.choice.label}</h2>
            <EffectsView effects={result.choice.fx} />
            <Dialogue npc={result.emergency ? (emergency?.npc ?? "andreas") : currentDay.npc}>
              <p>{result.choice.why}</p>
            </Dialogue>
            {result.emergency && (
              <p className="crew-reaction">
                {NPCS[(emergency?.npc ?? "andreas") as keyof typeof NPCS]?.name}: “
                {t("That was a scare!")}”
              </p>
            )}
            <div className="science-note">
              <BookOpen />
              <div>
                <h3>{t("Why does this happen?")}</h3>
                <p>
                  {result.emergency
                    ? eventIndex === 0
                      ? content.days[8]?.science
                      : eventIndex === 1
                        ? content.days[5]?.science
                        : content.days[3]?.science
                    : currentDay.science}
                </p>
                <Source index={result.emergency ? (emergency?.source ?? 4) : currentDay.source} />
              </div>
            </div>
            <Button
              className="primary-action"
              onClick={() => {
                if (result.emergency) setScreen("night");
                else if (day === 10) setScreen("end");
                else changeLight("dusk", goNight);
              }}
            >
              {result.emergency
                ? t("Return to the cabin")
                : day === 10
                  ? t("Complete the mission")
                  : t("Nightfall")}
              <ArrowRight />
            </Button>
          </section>
        )}
        {screen === "night" && (
          <section className="night-cabin">
            <span className="eyebrow">
              <Moon />
              {t("NIGHT")} {day} · {t("NEW HORIZON BASE")}
            </span>
            <h1>{t("A pause among the stars")}</h1>
            <Dialogue npc="lina">
              <p>{NPCS["lina"]?.quote}</p>
            </Dialogue>
            <div className="night-actions">
              <Button
                className="primary-action"
                disabled={Boolean(transition)}
                onClick={() => setScreen("explore")}
              >
                <Rocket />
                {t("Explore the base")}
              </Button>
              <Button
                variant="outline"
                disabled={Boolean(transition)}
                onClick={() => changeLight("dawn", sleep)}
              >
                <Moon />
                {t("Start next day")}
                <ArrowRight />
              </Button>
            </div>
          </section>
        )}
        {screen === "explore" && (
          <BaseMap
            player={player}
            day={day}
            attempts={attempts}
            completed={completed}
            onTask={(id) => {
              if (!canAttempt(attempts) || completed.includes(id)) return;
              setTaskId(id);
              setAttempts((a) => a + 1);
              setScreen("task");
            }}
            onSleep={() => setScreen("night")}
          />
        )}
        {screen === "task" && (
          <Minigame key={`${day}-${attempts}-${taskId}`} id={taskId} onFinish={finishTask} />
        )}
        {screen === "taskResult" && task && (
          <section className="result-screen">
            <span className="eyebrow">
              {t("NIGHT MISSION ·")}
              {task.place}
            </span>
            <h1>{won ? t("Mission completed!") : t("Back at base")}</h1>
            <h2>{task.name}</h2>
            {won ? (
              <>
                <EffectsView effects={task.reward} />
                <p>{t("Your reward is in your inventory to use during the day.")}</p>
              </>
            ) : (
              <p>{t("No item was received. The team can continue to the next day.")}</p>
            )}
            <div className="science-note">
              <BookOpen />
              <div>
                <h3>{t("Mission science")}</h3>
                <p>{task.fact}</p>
                <Source index={task.source} />
              </div>
            </div>
            <Button className="primary-action" onClick={() => setScreen("explore")}>
              {t("Return to the map")}
              <ArrowRight />
            </Button>
          </section>
        )}
        {screen === "end" && (
          <section className="end-screen">
            <span className="eyebrow">{t("FINAL JOURNAL · PROJECT NEW HORIZON")}</span>
            <h1>
              {failure
                ? t("Mission interrupted")
                : missionOutcome(stats) === "difficulties"
                  ? t("Mission completed with difficulties")
                  : t("Mission accomplished!")}
            </h1>
            {failure ? (
              <p>
                {failure === "timeout"
                  ? t("The time to respond to the emergency ran out.")
                  : failure === "radiation"
                    ? t("Radiation reached 100%.")
                    : t("{0} reached zero.", [t(LABELS[failure])])}
              </p>
            ) : (
              <p>
                {t(
                  "The support team arrived on the tenth day. You kept the team on Mars until rescue.",
                )}
              </p>
            )}
            {explanation && (
              <div className="science-note">
                <BookOpen />
                <div>
                  <h3>{t("What happened to the team?")}</h3>
                  <p>{t(explanation.text)}</p>
                  <Source index={explanation.source} />
                </div>
              </div>
            )}
            {!failure && risky.length > 0 && (
              <p>
                {t("Indicators at risk:")} {risky.map((k) => t(LABELS[k])).join(", ")}.
              </p>
            )}
            <p>
              {t("Side missions completed:")} <strong>{totalCompleted}</strong>
            </p>
            <h2>{t("Which decision could have been different?")}</h2>
            <div className="mission-journal">
              {journal.map((entry, i) => (
                <article key={i}>
                  <span>
                    {t("Day")} {entry.day} · {entry.title}
                  </span>
                  <strong>{entry.choice}</strong>
                  <p>{entry.why}</p>
                  <EffectsView effects={entry.fx} />
                </article>
              ))}
            </div>
            <h2 className="save-earth">
              <Leaf />
              {t(content.finalMessage)}
            </h2>
            <div className="end-actions">
              <Button onClick={() => setScreen("credits")}>
                {t("View credits")}
                <ArrowRight />
              </Button>
              <Button variant="outline" onClick={returnToStart}>
                {t("Play again")}
              </Button>
            </div>
          </section>
        )}
        {screen === "credits" && (
          <section
            className="credits-screen"
            style={{ backgroundImage: `url(${creditsBackgroundUrl})` }}
          >
            <div className="credits-window">
              <div className="credits-roll">
                <Rocket />
                <h1>MARS ACADEMY</h1>
                <p>{t("Project New Horizon")}</p>
                <h2>{t(content.finalMessage)}</h2>
                <p>{t("Created with AI assistance")}</p>
                <h3>{t("CREATORS")}</h3>
                {content.creators.map((name) => (
                  <p key={name}>{name}</p>
                ))}
                <h3>{t("SCIENTIFIC SOURCES")}</h3>
                {content.sources.map((source) => (
                  <p key={source.title}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </p>
                ))}
                <p>{t("NASA DONKI · Space weather")}</p>
                <p>NASA International Space Apps Challenge</p>
                <h2>{t("The future starts with you.")}</h2>
              </div>
            </div>
            <Button variant="outline" onClick={() => setScreen("end")}>
              {t("Return to the journal")}
            </Button>
            <Button onClick={returnToStart}>{t("Play again")}</Button>
          </section>
        )}
      </div>
      {active && screen !== "end" && (
        <aside className={`inventory ${inventoryOpen ? "open" : ""}`}>
          <Button
            variant="outline"
            className="inventory-trigger"
            aria-label={t("Open inventory")}
            aria-expanded={inventoryOpen}
            onClick={() => setInventoryOpen(!inventoryOpen)}
          >
            <Backpack />
            <span>{t("Inventory")}</span>
            <strong>{inventory.length}</strong>
          </Button>
          {inventoryOpen && (
            <div className="inventory-panel">
              <h2>{t("Mission items")}</h2>
              {inventory.length === 0 ? (
                <p>{t("No items collected.")}</p>
              ) : (
                inventory.map((item, i) => (
                  <div className="inventory-item" key={`${item.name}-${i}`}>
                    <span>{item.name}</span>
                    <EffectsView effects={item.fx} />
                    <Button
                      disabled={screen !== "day"}
                      size="sm"
                      onClick={() => {
                        useItem(i);
                        setJournal((j) => [
                          ...j,
                          {
                            day,
                            title: t("Item used"),
                            choice: item.name,
                            why: t("Reward collected on a night mission."),
                            fx: item.fx,
                          },
                        ]);
                      }}
                    >
                      {t("Use item")}
                    </Button>
                  </div>
                ))
              )}
              {screen !== "day" && inventory.length > 0 && (
                <p>{t("Items are available during the day.")}</p>
              )}
            </div>
          )}
        </aside>
      )}
      {toast && (
        <div className="game-toast" role="status">
          <Check />
          {toast}
        </div>
      )}
      <footer className="academy-footer">
        <span>MARS ACADEMY · NASA SPACE APPS</span>
        <span>{t("Numbers are game parameters, not actual NASA measurements.")}</span>
        {active && (
          <Button variant="ghost" size="sm" onClick={() => setDiaryOpen(!diaryOpen)}>
            <BookOpen />
            {t("Journal")}
          </Button>
        )}
      </footer>
      {tutorialOpen && (
        <div className="diary-overlay" role="dialog" aria-modal="true" aria-label="Tutorial">
          <section className="tutorial-panel">
            <Button
              variant="ghost"
              size="icon"
              className="tutorial-close"
              aria-label={t("Close tutorial")}
              onClick={() => setTutorialOpen(false)}
            >
              <X />
            </Button>
            <span className="eyebrow">{t("CREW MANUAL")}</span>
            <h2>{t("How to play")}</h2>
            <p>
              <strong>{t("During the day:")}</strong>
              {t(
                "read the transmission, select “Make a decision” and choose an action. Keep oxygen, water and health above zero until Day 10.",
              )}
            </p>
            <p>
              <strong>{t("At night:")}</strong>
              {t("resolve any emergency before going out. Running out of time ends the mission.")}
            </p>
            <p>
              <strong>{t("Explore:")}</strong>
              {t(
                "move Maya or Milo with the arrows, W A S D or the on-screen controls. Reach the marker and press Enter — or select “Start mission”. Up to three attempts per night.",
              )}
            </p>
            <p>
              <strong>{t("Inventory:")}</strong>
              {t(
                "rewards go in the backpack in the bottom-right corner. Use items during the day.",
              )}
            </p>
            <p>
              <strong>{t("Return to the cabin")}</strong>
              {t("and select “Start next day” when you are ready.")}
            </p>
            <Button onClick={() => setTutorialOpen(false)}>
              {t("Got it")}
              <Check />
            </Button>
          </section>
        </div>
      )}
      {objectiveOpen && (
        <div className="diary-overlay" role="dialog" aria-modal="true" aria-label={t("Objective")}>
          <section className="tutorial-panel">
            <Button
              variant="ghost"
              size="icon"
              className="tutorial-close"
              aria-label={t("Close objective")}
              onClick={() => setObjectiveOpen(false)}
            >
              <X />
            </Button>
            <span className="eyebrow">MARS ACADEMY</span>
            <h2>{t("Objective")}</h2>
            {content.objective.map((text) => (
              <p key={text}>{text}</p>
            ))}
            <Button onClick={() => setObjectiveOpen(false)}>
              {t("Got it")}
              <Check />
            </Button>
          </section>
        </div>
      )}
      {diaryOpen && (
        <div
          className="diary-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t("Mission journal")}
        >
          <section>
            <h2>{t("Mission journal")}</h2>
            {journal.length === 0 ? (
              <p>{t("The mission is beginning.")}</p>
            ) : (
              journal.map((j, i) => (
                <p key={i}>
                  <strong>
                    {t("Day")}
                    {j.day}:{" "}
                  </strong>
                  {j.choice}
                </p>
              ))
            )}
            <Button onClick={() => setDiaryOpen(false)}>{t("Close journal")}</Button>
          </section>
        </div>
      )}
    </main>
  );
}
function MapLocation() {
  return <span className="location-dot" aria-hidden="true" />;
}
