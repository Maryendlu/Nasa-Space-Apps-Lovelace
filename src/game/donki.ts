import type { Effects } from "./rules";
export const DONKI_BASE = "https://ccmc.gsfc.nasa.gov/DONKI-API/get/";
export const DONKI_REFERENCE = "https://ccmc.gsfc.nasa.gov/DONKI/api/";
type Endpoint = "FLR" | "CME" | "GST";
export type SpaceWeather = {
  risk: number;
  strongest: string | null;
  cmes: number | null;
  storms: number | null;
  offline: boolean;
  unavailable: Endpoint[];
  start: string;
  end: string;
};
export function flareRisk(strongest: string): number {
  return strongest.startsWith("X")
    ? 3
    : strongest.startsWith("M")
      ? 2
      : /^[BC]/.test(strongest)
        ? 1
        : 0;
}
function validEvents(value: unknown, endpoint: Endpoint): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) return false;
  const id = endpoint === "FLR" ? "flrID" : endpoint === "CME" ? "activityID" : "gstID";
  return value.every((event: unknown) => {
    if (!event || typeof event !== "object") return false;
    const row = event as Record<string, unknown>;
    return (
      typeof row[id] === "string" &&
      (endpoint !== "FLR" ||
        (typeof row["classType"] === "string" && /^[ABCMX]\d+(\.\d+)?$/.test(row["classType"])))
    );
  });
}
// Public browser reads from the documented NASA CCMC API; no private key.
export async function loadSpaceWeather(
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<SpaceWeather> {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 30);
  const dates = { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
  const endpoints: Endpoint[] = ["FLR", "CME", "GST"];
  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetcher(
          `${DONKI_BASE}${endpoint}?startDate=${dates.start}&endDate=${dates.end}`,
          {
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!response.ok) return null;
        const data: unknown = await response.json();
        return validEvents(data, endpoint) ? data : null;
      } catch {
        return null;
      }
    }),
  );
  const [flares, cmes, storms] = results;
  const classes = (flares ?? []).map((event) => String(event["classType"]));
  const power = (value: string) =>
    "ABCMX".indexOf(value[0] ?? "A") * 100000 + Number(value.slice(1));
  classes.sort((a, b) => power(b) - power(a));
  const strongest = flares ? (classes[0] ?? "None") : null;
  return {
    ...dates,
    strongest,
    // Moderate fallback is a labelled simulation rule, not an observation.
    risk: strongest === null ? 2 : flareRisk(strongest),
    cmes: cmes?.length ?? null,
    storms: storms?.length ?? null,
    offline: results.every((result) => result === null),
    unavailable: endpoints.filter((_, index) => results[index] === null),
  };
}
export type Choice = { label: string; fx: Effects; why: string };
