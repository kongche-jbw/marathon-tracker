import { describe, it, expect } from "vitest";
import type { Race } from "@/types/race";
import { DEFAULT_FILTERS, filterRaces, parseRaceView, serializeRaceView, type RaceView } from "./filters";
const now = new Date("2026-10-11T08:00:00+08:00");
const domestic: Race = { id: "chenzhou", name: "郴州马拉松", shortName: "郴马", country: "中国", province: "湖南", city: "郴州", raceDate: "2026-11-08", regStatus: "open", events: ["全程马拉松", "10公里"], category: "A", updatedAt: "2026-10-10T00:00:00Z" };
const overseas: Race = { ...domestic, id: "rome-2027", name: "Rome Marathon", shortName: "罗马", country: "意大利", city: "Rome", raceDate: "2027-03-14", province: undefined };
const view: RaceView = { tab: "domestic", filters: DEFAULT_FILTERS };

describe("race discovery filters", () => {
  it("无参数保持原来的全国、未结束视图", () => expect(parseRaceView("")).toEqual(view));
  it("地区、状态、项目和中文查询可通过 URL 往返恢复", () => {
    const next: RaceView = { tab: "international", filters: { ...DEFAULT_FILTERS, keyword: "Rome 意大利", region: "意大利", status: "open", event: "10公里" } };
    const query = serializeRaceView(next, "campaign=friend");
    expect(parseRaceView(query)).toEqual(next);
    expect(new URLSearchParams(query).get("campaign")).toBe("friend");
    expect(serializeRaceView(view, query)).toBe("campaign=friend");
  });
  it("不可信枚举回到默认值，已结束参数不会互相矛盾", () => {
    expect(parseRaceView("?tab=wrong&status=bad&quick=bad")).toEqual(view);
    expect(parseRaceView("?status=finished").filters.quick).toBe("finished");
    expect(parseRaceView("?status=open&quick=finished").filters.status).toBe("finished");
  });
  it("搜索覆盖简称、省份、城市、国家及多词", () => {
    for (const keyword of ["郴马", "湖南 郴州", "中国", "  湖南  "]) expect(filterRaces([domestic], { ...view, filters: { ...DEFAULT_FILTERS, keyword } }, now)).toEqual([domestic]);
  });
  it("英文大小写与全角输入归一化，不添加未经证实的译名", () => {
    for (const keyword of ["ROME", "ｒｏｍｅ", "rome 意大利"]) expect(filterRaces([overseas], { tab: "international", filters: { ...DEFAULT_FILTERS, keyword } }, now)).toEqual([overseas]);
  });
  it("多个筛选条件取交集，隐藏其他地区与不匹配项目", () => {
    expect(filterRaces([domestic, overseas], { ...view, filters: { ...DEFAULT_FILTERS, region: "湖南", status: "open", event: "10公里" } }, now)).toEqual([domestic]);
    expect(filterRaces([domestic], { ...view, filters: { ...DEFAULT_FILTERS, event: "半程马拉松" } }, now)).toEqual([]);
  });
  it("保留上游无完整报名窗口时的显式状态兜底", () => expect(filterRaces([domestic], { ...view, filters: { ...DEFAULT_FILTERS, status: "open" } }, now)).toEqual([domestic]));
  it("历史赛事默认隐藏，finished 和 all 可以找回", () => {
    const old = { ...domestic, raceDate: "2026-01-01" };
    expect(filterRaces([old], view, now)).toEqual([]);
    expect(filterRaces([old], parseRaceView("?status=finished"), now)).toEqual([old]);
    expect(filterRaces([old], parseRaceView("?quick=all"), now)).toEqual([old]);
  });
});
