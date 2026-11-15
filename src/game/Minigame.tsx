import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameLanguage } from "./language";

type Props = { id: string; onFinish: (won: boolean) => void };
const WATER = ["Water intake", "Filtration", "Quality check", "Reservoir"];
const SUIT = ["Oxygen", "Ventilation", "CO₂ removal", "Communication"];
const FUNCTIONS = [
  "Supply breathable air",
  "Circulate air",
  "Remove exhaled gas",
  "Talk to the team",
];
const CODES = ["MRS-0418", "MRS-0481", "MRS-4018"];

export function Minigame({ id, onFinish }: Props) {
  const { t, content } = useGameLanguage();
  const water = WATER.map((value) => t(value));
  const suit = SUIT.map((value) => t(value));
  const functions = FUNCTIONS.map((value) => t(value));
  const task = content.tasks.find((t) => t.id === id);
  const [seconds, setSeconds] = useState(id === "solar" ? 50 : id === "route" ? 60 : 120);
  const [selected, setSelected] = useState<number | null>(null);
  const [connected, setConnected] = useState<number[]>([]);
  const [code, setCode] = useState("");
  const [seed, setSeed] = useState(1);
  const [horizontal, setHorizontal] = useState(15);
  const [vertical, setVertical] = useState(20);
  const [dust, setDust] = useState<number[]>(() =>
    Array.from({ length: 64 }, (_, i) => (i % 5 === 0 ? 2 : 1)),
  );
  const [position, setPosition] = useState(0);
  const [drilled, setDrilled] = useState(false);
  const [order, setOrder] = useState<number[]>([]);
  const [answers, setAnswers] = useState(["", "", "", ""]);
  const [message, setMessage] = useState("");
  const [painting, setPainting] = useState(false);
  const finished = useRef(false);
  const callback = useRef(onFinish);
  callback.current = onFinish;
  const finish = (won: boolean) => {
    if (finished.current) return;
    finished.current = true;
    callback.current(won);
  };
  useEffect(() => {
    const deadline = Date.now() + (id === "solar" ? 50 : id === "route" ? 60 : 120) * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !finished.current) {
        finished.current = true;
        callback.current(false);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [id]);
  useEffect(() => {
    if (id !== "solar") return;
    const wind = setInterval(
      () =>
        setDust((previous) => {
          const next = [...previous];
          const i = Math.floor(Math.random() * 64);
          next[i] = Math.min(2, (next[i] ?? 0) + 1);
          return next;
        }),
      4500,
    );
    return () => clearInterval(wind);
  }, [id]);
  const clean = (i: number) => {
    const next = dust.map((d, j) => (j === i ? Math.max(0, d - 1) : d));
    setDust(next);
    if (next.filter((d) => d === 0).length / 64 >= 0.9) finish(true);
  };
  const signal = Math.max(0, Math.round(100 - Math.hypot(horizontal - 67, vertical - 42) * 1.5));
  const move = (dx: number, dy: number) => {
    const x = (position % 7) + dx;
    const y = Math.floor(position / 7) + dy;
    if (x < 0 || x > 6 || y < 0 || y > 6) return;
    const next = y * 7 + x;
    if ([9, 10, 17, 22, 30, 31, 38].includes(next)) {
      setPosition(0);
      setDrilled(false);
      setMessage(t("Forbidden area! The arm returned to the start."));
    } else {
      setPosition(next);
      setMessage("");
    }
  };
  if (!task) return null;
  return (
    <section className="task-screen" aria-label={task.name}>
      <div className="task-heading">
        <div>
          <span className="eyebrow">{task.place}</span>
          <h2>{task.name}</h2>
        </div>
        <span className={seconds <= 10 ? "timer danger" : "timer"} role="timer">
          {seconds}s
        </span>
      </div>
      <p className="task-instructions">{task.instructions}</p>
      {id === "wires" && (
        <div className="wire-board">
          <div>
            {[t("Red"), t("Blue"), t("Yellow")].map((color, i) => (
              <Button
                key={color}
                variant="outline"
                className={`wire wire-${i} ${selected === i ? "selected" : ""}`}
                disabled={connected.includes(i)}
                onClick={() => setSelected(i)}
              >
                {connected.includes(i) ? <Check /> : <span className="wire-dot" />}
                {color}
              </Button>
            ))}
          </div>
          <div>
            {[2, 0, 1].map((i) => (
              <Button
                key={i}
                variant="outline"
                className={`wire wire-${i}`}
                disabled={connected.includes(i)}
                onClick={() => {
                  if (selected === i) {
                    const next = [...connected, i];
                    setConnected(next);
                    setSelected(null);
                    setMessage(t("Circuit connected."));
                    if (next.length === 3) finish(true);
                  } else setMessage(t("The colors do not match. Try again."));
                }}
              >
                <span className="wire-dot" />
                {[t("Red"), t("Blue"), t("Yellow")][i]}
              </Button>
            ))}
          </div>
        </div>
      )}
      {id === "code" && (
        <div className="code-board">
          <p>
            {t("The first digit is")} {seed}
            {t(". The second is")} {seed + 1}
            {t(". The third is")} {seed + 2}
            {t(". The last is twice the first.")}
          </p>
          <label>
            {t("Reset code")}
            <input
              aria-label={t("Reset code")}
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="____"
            />
          </label>
          <Button
            onClick={() => {
              if (code === `${seed}${seed + 1}${seed + 2}${seed * 2}`) finish(true);
              else {
                setSeed(seed === 3 ? 1 : seed + 1);
                setCode("");
                setMessage(t("Incorrect code. A new clue has been generated."));
              }
            }}
          >
            {t("Restart generator")}
          </Button>
        </div>
      )}
      {id === "antenna" && (
        <div className="antenna-board">
          <div className={`signal-number ${signal > 92 ? "signal-good" : ""}`}>{signal}%</div>
          <progress max={100} value={signal} aria-label={t("Signal strength")} />
          <label>
            Horizontal{" "}
            <input
              type="range"
              min={0}
              max={100}
              value={horizontal}
              onChange={(e) => {
                const h = Number(e.target.value);
                setHorizontal(h);
                if (100 - Math.hypot(h - 67, vertical - 42) * 1.5 > 92) finish(true);
              }}
            />
          </label>
          <label>
            Vertical{" "}
            <input
              type="range"
              min={0}
              max={100}
              value={vertical}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVertical(v);
                if (100 - Math.hypot(horizontal - 67, v - 42) * 1.5 > 92) finish(true);
              }}
            />
          </label>
        </div>
      )}
      {id === "solar" && (
        <div className="solar-board">
          <p>
            {Math.round((dust.filter((d) => d === 0).length / 64) * 100)}
            {t("% clean")}
          </p>
          <div
            className="dust-grid"
            onPointerUp={() => setPainting(false)}
            onPointerLeave={() => setPainting(false)}
          >
            {dust.map((d, i) => (
              <Button
                key={i}
                variant="ghost"
                aria-label={t("Clean sector {0}", [i + 1])}
                className={`dust-cell dust-${d}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setPainting(true);
                  clean(i);
                }}
                onPointerEnter={() => {
                  if (painting) clean(i);
                }}
                onClick={(e) => {
                  if (e.detail === 0) clean(i);
                }}
              >
                {d > 0 ? "·" : <Check />}
              </Button>
            ))}
          </div>
        </div>
      )}
      {id === "rock" && (
        <div className="robot-board">
          <div className="robot-grid">
            {Array.from({ length: 49 }, (_, i) => (
              <span key={i} className={[9, 10, 17, 22, 30, 31, 38].includes(i) ? "blocked" : ""}>
                {position === i ? "▣" : i === 48 ? "◆" : "·"}
              </span>
            ))}
          </div>
          <div className="direction-pad">
            {[
              [ArrowUp, 0, -1, t("Up")],
              [ArrowLeft, -1, 0, t("Left")],
              [ArrowDown, 0, 1, t("Down")],
              [ArrowRight, 1, 0, t("Right")],
            ].map(([Icon, dx, dy, label]) => {
              const I = Icon as typeof ArrowUp;
              return (
                <Button
                  key={String(label)}
                  variant="outline"
                  size="icon"
                  aria-label={String(label)}
                  onClick={() => move(Number(dx), Number(dy))}
                >
                  <I />
                </Button>
              );
            })}
          </div>
          <Button
            onClick={() => {
              if (position === 48) {
                setDrilled(true);
                setMessage(t("Sample collected. Store it in the tube."));
              } else setMessage(t("Position the arm over the rock."));
            }}
          >
            {t("Drill")}
          </Button>
          <Button disabled={!drilled} onClick={() => finish(true)}>
            {t("Store in tube")}
          </Button>
        </div>
      )}
      {id === "water" && (
        <div className="water-board">
          <ol>
            {order.map((i) => (
              <li key={i}>{water[i]}</li>
            ))}
          </ol>
          <div className="task-options">
            {[2, 0, 3, 1].map((i) => (
              <Button
                key={i}
                variant="outline"
                disabled={order.includes(i)}
                onClick={() => {
                  if (i === order.length) {
                    const next = [...order, i];
                    setOrder(next);
                    if (next.length === 4) finish(true);
                  } else {
                    setOrder([]);
                    setMessage(t("Water must pass through the stages in the correct order."));
                  }
                }}
              >
                {water[i]}
              </Button>
            ))}
          </div>
        </div>
      )}
      {id === "route" && (
        <div className="route-board">
          <div className="rover-grid">
            {Array.from({ length: 36 }, (_, i) => (
              <Button
                key={i}
                variant="ghost"
                aria-label={t("Square {0}", [i + 1])}
                className={
                  i === position
                    ? "rover-current"
                    : [7, 8, 13, 16, 20, 22, 26].includes(i)
                      ? "blocked"
                      : ""
                }
                onClick={() => {
                  if ([7, 8, 13, 16, 20, 22, 26].includes(i)) {
                    setMessage(t("Crater! Choose another route."));
                    return;
                  }
                  if (
                    Math.abs((i % 6) - (position % 6)) +
                      Math.abs(Math.floor(i / 6) - Math.floor(position / 6)) ===
                    1
                  ) {
                    setPosition(i);
                    if (i === 35) finish(true);
                  } else setMessage(t("Choose an adjacent square."));
                }}
              >
                {i === position
                  ? "▣"
                  : i === 35
                    ? "⚑"
                    : [7, 8, 13, 16, 20, 22, 26].includes(i)
                      ? "◉"
                      : "·"}
              </Button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setPosition(0)}>
            <RotateCcw />
            {t("Restart route")}
          </Button>
        </div>
      )}
      {id === "suit" && (
        <div className="matching-board">
          {SUIT.map((part, i) => (
            <label key={part}>
              {part}
              <select
                aria-label={part}
                value={answers[i]}
                onChange={(e) => setAnswers((a) => a.map((v, j) => (i === j ? e.target.value : v)))}
              >
                <option value="">{t("Select function")}</option>
                {[2, 0, 3, 1].map((j) => (
                  <option key={j} value={j}>
                    {functions[j]}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <Button
            onClick={() => {
              if (answers.every((a, i) => a === String(i))) finish(true);
              else setMessage(t("A component is connected to the wrong function. Check the suit."));
            }}
          >
            {t("Test suit")}
          </Button>
        </div>
      )}
      {id === "samples" && (
        <div className="matching-board">
          <div className="sample-key">
            {CODES.map((c, i) => (
              <p key={c}>
                {c} → {t("Compartment")} {String.fromCharCode(65 + i)}
              </p>
            ))}
          </div>
          {CODES.map((c, i) => (
            <label key={c}>
              {c}
              <select
                aria-label={c}
                value={answers[i]}
                onChange={(e) => setAnswers((a) => a.map((v, j) => (i === j ? e.target.value : v)))}
              >
                <option value="">{t("Select compartment")}</option>
                {[0, 1, 2].map((j) => (
                  <option key={j} value={j}>
                    {t("Compartment")} {String.fromCharCode(65 + j)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <Button
            onClick={() => {
              if (answers.slice(0, 3).every((a, i) => a === String(i))) finish(true);
              else setMessage(t("Check the tube codes and try again."));
            }}
          >
            {t("Store samples")}
          </Button>
        </div>
      )}
      <p className="task-message" role="status">
        {message}
      </p>
      <Button variant="ghost" onClick={() => finish(false)}>
        {t("Return to base")}
      </Button>
    </section>
  );
}
