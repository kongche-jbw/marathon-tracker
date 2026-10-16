import type { Race } from "@/types/race";
import { checkInterval } from "./schedule";

export interface UpdateHealth {
  lastSuccessfulRun: string | null;
  lastRun: { completedAt: string; succeeded: number; failed: number } | null;
}

export function recordRun(previous: UpdateHealth, succeeded: number, failed: number, completedAt: string): UpdateHealth {
  return {
    lastSuccessfulRun: failed === 0 ? completedAt : previous.lastSuccessfulRun,
    lastRun: { completedAt, succeeded, failed },
  };
}

export function formatCheckedAt(value: string | null | undefined): string {
  const stamp = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(stamp)) return "暂无记录";
  return new Date(stamp + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ");
}

export function summarizeFreshness(races: Race[], now: Date) {
  const timestamps = races.map(race => Date.parse(race.updatedAt))
    .filter(stamp => Number.isFinite(stamp) && stamp <= now.getTime());
  const daily = races.filter(race => checkInterval(race, now) === 1);
  const staleDaily = daily.filter(race => {
    const stamp = Date.parse(race.updatedAt);
    return !Number.isFinite(stamp) || stamp > now.getTime() || now.getTime() - stamp > 36 * 3600000;
  }).length;
  return {
    latestRecordAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null,
    staleDaily,
    dailyCount: daily.length,
  };
}
