import type { Race } from "@/types/race";
import { deriveStatus, sortRaces } from "./status";

export interface Filters {
  region: string;
  status: string;
  event: string;
  keyword: string;
  month: string;
  quick: "unfinished" | "finished" | "all";
}
export interface RaceView { tab: "domestic" | "international"; filters: Filters }
export const DEFAULT_FILTERS: Filters = { region: "", status: "", event: "", keyword: "", month: "", quick: "unfinished" };
const statuses = ["open", "today", "drawing", "pending", "closed", "finished"];

export function parseRaceView(search: string): RaceView {
  const params = new URLSearchParams(search);
  const status = params.get("status") ?? "";
  const quick = params.get("quick");
  const filters: Filters = {
    region: params.get("region") ?? "",
    event: params.get("event") ?? "",
    keyword: params.get("q") ?? "",
    month: /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get("month") ?? "") ? params.get("month")! : "",
    status: statuses.includes(status) ? status : "",
    quick: quick === "all" || quick === "finished" ? quick : "unfinished",
  };
  if (filters.status === "finished" || filters.quick === "finished") {
    filters.status = "finished";
    filters.quick = "finished";
  }
  return { tab: params.get("tab") === "international" ? "international" : "domestic", filters };
}

/** Preserve unrelated query parameters; omit defaults so the normal home URL stays short. */
export function serializeRaceView(view: RaceView, search = ""): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries({
    tab: view.tab === "domestic" ? "" : view.tab,
    region: view.filters.region, status: view.filters.status,
    event: view.filters.event, q: view.filters.keyword, month: view.filters.month,
    quick: view.filters.quick === "unfinished" ? "" : view.filters.quick,
  })) {
    if (value) params.set(key, value); else params.delete(key);
  }
  return params.toString();
}

export function filterRaces(races: Race[], view: RaceView, now: Date): Race[] {
  const normalize = (s: string) => s.normalize("NFKC").toLowerCase();
  const words = normalize(view.filters.keyword).trim().split(/\s+/).filter(Boolean);
  const { tab, filters } = view;
  return sortRaces(races.filter(race => {
    if ((race.country === "中国") !== (tab === "domestic")) return false;
    const status = deriveStatus(race, now);
    if (filters.quick === "unfinished" && status === "finished") return false;
    if (filters.quick === "finished" && status !== "finished") return false;
    if (filters.status && filters.status !== status) return false;
    if (filters.region && filters.region !== (tab === "domestic" ? race.province : race.country)) return false;
    if (filters.month && race.raceDate.slice(0, 7) !== filters.month) return false;
    if (filters.event && !race.events.includes(filters.event)) return false;
    const text = normalize([race.name, race.shortName, race.province, race.city, race.country, race.id].filter(Boolean).join(" "));
    return words.every(word => text.includes(word));
  }), now);
}
