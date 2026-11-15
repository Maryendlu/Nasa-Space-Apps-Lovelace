import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameLanguage } from "./language";
import { worldUrl, sprites } from "./art";
import { MAX_TASKS } from "./rules";
import { STATIONS, moveExplorer, nearbyStation, canEnterStation } from "./exploration";

import { DIRECTION_ROWS, movementDirection, movementFrame, type Direction } from "./motion";

type Props = {
  player: string;
  day: number;
  attempts: number;
  completed: string[];
  onTask: (id: string) => void;
  onSleep: () => void;
};
export function BaseMap({ player, day, attempts, completed, onTask, onSleep }: Props) {
  const { t, content } = useGameLanguage();
  const [position, setPosition] = useState({ x: 49, y: 63 });
  const [walking, setWalking] = useState(false);
  const [direction, setDirection] = useState<Direction>("down");
  const [frame, setFrame] = useState(1);
  const walkStart = useRef<number | null>(null);
  const keys = useRef(new Set<string>());
  const viewport = useRef<HTMLDivElement | null>(null);
  const held = useRef<[number, number] | null>(null);
  const pRef = useRef(position);
  pRef.current = position;
  const nearby = nearbyStation(position);
  const task = content.tasks.find((t) => t.id === nearby);
  useEffect(() => {
    const view = viewport.current;
    if (!view) return;
    view.scrollLeft = (position.x / 100) * view.scrollWidth - view.clientWidth / 2;
  }, [position]);
  const interact = () => {
    if (nearby && canEnterStation(position, nearby, attempts, completed)) onTask(nearby);
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "a",
          "s",
          "d",
          "W",
          "A",
          "S",
          "D",
        ].includes(e.key)
      ) {
        e.preventDefault();
        keys.current.add(e.key.toLowerCase());
      }
      if (e.key === "Enter" && !e.repeat && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        const id = nearbyStation(pRef.current);
        if (id && canEnterStation(pRef.current, id, attempts, completed)) onTask(id);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const clear = () => {
      keys.current.clear();
      held.current = null;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    const timer = setInterval(() => {
      const k = keys.current;
      const dx =
        held.current?.[0] ??
        Number(k.has("arrowright") || k.has("d")) - Number(k.has("arrowleft") || k.has("a"));
      const dy =
        held.current?.[1] ??
        Number(k.has("arrowdown") || k.has("s")) - Number(k.has("arrowup") || k.has("w"));
      setWalking(Boolean(dx || dy));
      setDirection((last) => movementDirection(dx, dy, last));
      if (dx || dy) {
        walkStart.current ??= performance.now();
        setFrame(movementFrame(performance.now() - walkStart.current, true));
      } else {
        walkStart.current = null;
        setFrame(movementFrame(0, false));
      }
      if (dx || dy) setPosition((p) => moveExplorer(p, dx * 0.48, dy * 0.85));
    }, 30);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [attempts, completed, onTask]);
  return (
    <section
      className="world-screen"
      aria-label={t("Base exploration map")}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="world-viewport" ref={viewport}>
        <div className="world-canvas">
          <img src={worldUrl} className="world-scenery" draggable={false} alt={t("Official New Horizon Base map")} />
          {STATIONS.map((s, i) => (
            <div
              key={s.id}
              className={`mission-beacon ${completed.includes(s.id) ? "complete" : ""} ${nearby === s.id ? "near" : ""}`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              title={content.tasks[i]?.place}
            >
              {completed.includes(s.id) ? <Check /> : <MapPin />}
              <span>{content.tasks[i]?.place}</span>
            </div>
          ))}
          <div
            className={`map-player ${walking ? "walking" : ""}`}
            role="img"
            data-direction={direction}
            data-frame={frame}
            aria-label={player === "maya" ? "Maya" : "Milo"}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          >
            <img
              className="player-sprites"
              src={sprites[player]}
              draggable={false}
              alt=""
              style={{ left: `${frame * -100}%`, top: `${DIRECTION_ROWS[direction] * -100}%` }}
            />
          </div>
        </div>
      </div>
      <div className="world-heading">
        <span>
          {t("NIGHT")} {day}
          {t("· MISSIONS")} {attempts}/{MAX_TASKS}
        </span>
        <Button variant="outline" onClick={onSleep}>
          <LogOut />
          {t("Return to the cabin")}
        </Button>
      </div>
      <div className="world-controls">
        <div className="direction-pad">
          {(
            [
              [ArrowLeft, -1, 0, t("left")],
              [ArrowUp, 0, -1, t("up")],
              [ArrowDown, 0, 1, t("down")],
              [ArrowRight, 1, 0, t("right")],
            ] as const
          ).map(([Icon, dx, dy, label]) => (
            <Button
              key={label}
              variant="outline"
              size="icon"
              title={t("Move {0}", [label])}
              aria-label={t("Move {0}", [label])}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                held.current = [dx, dy];
              }}
              onPointerUp={() => {
                held.current = null;
              }}
              onPointerCancel={() => {
                held.current = null;
              }}
            >
              <Icon />
            </Button>
          ))}
        </div>
        {task && (
          <div className="proximity-prompt">
            <strong>{task.name}</strong>
            <span>{task.rewardText}</span>
            <Button
              disabled={!nearby || !canEnterStation(position, nearby, attempts, completed)}
              onClick={interact}
            >
              {completed.includes(task.id)
                ? t("Completed")
                : attempts >= MAX_TASKS
                  ? t("Mission limit reached")
                  : t("Press Enter · Start mission")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
