import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portraits } from "./art";
import { useGameLanguage } from "./language";

export function Transmission({
  npc,
  text,
  onReady,
}: {
  npc: string;
  text: string;
  onReady: () => void;
}) {
  const { t, content } = useGameLanguage();
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCount(text.length);
      return;
    }
    const timer = setInterval(() => setCount((c) => Math.min(text.length, c + 3)), 20);
    return () => clearInterval(timer);
  }, [text]);
  const person = Object.entries(content.npcs).find(([id]) => id === npc)?.[1];
  return (
    <div className="transmission dialogue">
      <img src={portraits[npc]} alt={person?.name ?? npc} />
      <div>
        <span className="dialogue-name">
          {person?.name}
          <small>{t("BASE TRANSMISSION")}</small>
        </span>
        <p className="transmission-text" aria-label={text}>
          {text.slice(0, count)}
          <span className="text-cursor" aria-hidden="true">
            ▌
          </span>
        </p>
        {!ready && (
          <Button
            variant="ghost"
            className="transmission-next"
            onClick={() => {
              if (count < text.length) setCount(text.length);
              else {
                setReady(true);
                onReady();
              }
            }}
          >
            {count < text.length ? t("Show message") : t("Make a decision")}
            <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
