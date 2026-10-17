import { it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RaceEvidence from "./RaceEvidence";
import RaceCard from "./RaceCard";
import type { Race } from "@/types/race";
vi.mock("../../data/pending-reviews.json", () => ({ default: [{ raceId: "demo", from: "2026-11-01" }] }));
const now = new Date("2026-10-16T04:00:00Z");
const race: Race = { id: "demo", name: "测试赛事", country: "中国", raceDate: "2026-11-01", regStatus: "open", events: ["全程马拉松"], category: "unknown", updatedAt: now.toISOString() };
it("无来源时明确提示，不把官网称作直接报名链接", () => {
  const html = renderToStaticMarkup(createElement(RaceEvidence, { race, now }));
  expect(html).toContain("暂无已核验"); expect(html).toContain("来源公告待补充"); expect(html).toContain("有赛期变更线索待复核");
});
it("人工证据和模型线索分开展示，未知认证不显示为 B 类", () => {
  const item: Race = { ...race, sources: [{ url: "https://example.org/hint", scope: "general", observedAt: now.toISOString() }, { url: "https://example.org/notice", scope: "raceDate", observedAt: now.toISOString(), verifiedAt: now.toISOString() }] };
  const html = renderToStaticMarkup(createElement(RaceCard, { race: item, now }));
  expect(html).toContain("认证待核验"); expect(html).toContain("模型提供的线索"); expect(html).toContain("赛期核验于");
});
it("慈善通道明确说明报名类型和资格条件", () => {
  const item: Race = { ...race, registrationChannels: [{ name: "公益跑者", kind: "charity", status: "open", url: "https://example.org/charity", sourceUrl: "https://example.org/notice", verifiedAt: now.toISOString(), requirements: "需完成最低筹款额度" }] };
  const html = renderToStaticMarkup(createElement(RaceEvidence, { race: item, now }));
  expect(html).toContain("查看慈善名额入口"); expect(html).toContain("需完成最低筹款额度"); expect(html).toContain("核验公告");
});
it("公众号报名无网址时显示报名指引而非入口链接，且不显示暂无通道提示", () => {
  const item: Race = { ...race, registrationChannels: [{ name: "普通报名", kind: "general", status: "open", entranceType: "wechat_official", entranceHint: "微信搜索'测试赛事'公众号→菜单栏报名", sourceUrl: "https://example.org/notice", verifiedAt: now.toISOString() }] };
  const html = renderToStaticMarkup(createElement(RaceEvidence, { race: item, now }));
  expect(html).toContain("报名方式：微信公众号"); expect(html).toContain("菜单栏报名"); expect(html).toContain("核验公告");
  expect(html).not.toContain("暂无已核验");
});
