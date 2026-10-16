import { describe, it, expect } from "vitest";
import { formatCheckedAt, recordRun, summarizeFreshness } from "./freshness";
import type { Race } from "@/types/race";
const now = new Date("2026-10-16T12:00:00+08:00");
const race: Race = { id: "demo", name: "测试赛事", country: "中国", raceDate: "2026-11-01", regStatus: "open", events: ["全程马拉松"], category: "B", updatedAt: "2026-10-14T16:00:00Z" };

describe("data freshness", () => {
  it("36 小时边界以及超过边界", () => {
    expect(summarizeFreshness([race], now).staleDaily).toBe(0);
    expect(summarizeFreshness([{ ...race, updatedAt: "2026-10-14T15:59:59Z" }], now).staleDaily).toBe(1);
  });
  it("历史赛事和周检赛事不会被按日检误报", () => {
    const old = { ...race, updatedAt: "2026-08-01T00:00:00Z" };
    expect(summarizeFreshness([{ ...old, raceDate: "2026-10-01" }, { ...old, raceDate: "2026-12-01", regStatus: "pending" }], now).staleDaily).toBe(0);
  });
  it("部署时间不参与数据时间，坏日期与未来时间不能制造新鲜记录", () => {
    const result = summarizeFreshness([race, { ...race, updatedAt: "bad" }, { ...race, updatedAt: "2099-01-01T00:00:00Z" }], now);
    expect(result.latestRecordAt).toBe("2026-10-14T16:00:00.000Z");
    expect(result.staleDaily).toBe(2);
    expect(summarizeFreshness([], now).latestRecordAt).toBeNull();
  });
  it("格式化固定使用北京时间且兼容旧数据", () => {
    expect(formatCheckedAt("2026-10-16T04:00:00Z")).toBe("2026-10-16 12:00");
    expect(formatCheckedAt(null)).toBe("暂无记录");
    expect(formatCheckedAt("bad")).toBe("暂无记录");
  });
  it("部分/全部失败保留上次完整成功时间，零待查也记录任务运行", () => {
    const previous = { lastSuccessfulRun: "2026-10-10T00:00:00Z", lastRun: null };
    const stamp = now.toISOString();
    expect(recordRun(previous, 2, 1, stamp).lastSuccessfulRun).toBe(previous.lastSuccessfulRun);
    expect(recordRun(previous, 0, 3, stamp).lastSuccessfulRun).toBe(previous.lastSuccessfulRun);
    expect(recordRun(previous, 3, 0, stamp).lastSuccessfulRun).toBe(stamp);
    expect(recordRun(previous, 0, 0, stamp).lastRun).toEqual({ completedAt: stamp, succeeded: 0, failed: 0 });
  });
});
