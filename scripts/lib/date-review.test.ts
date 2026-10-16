import { describe, it, expect } from "vitest";
import type { Race } from "../../src/types/race";
import { approveDate, proposeDate } from "./date-review";
const now = "2026-10-16T04:00:00.000Z";
const race: Race = { id: "demo", name: "测试赛事", country: "中国", raceDate: "2026-11-01", regStatus: "open", events: ["全程马拉松"], category: "B", updatedAt: now, regEnd: "2026-10-30" };
const proposal = proposeDate(race, "2026-11-08", ["https://example.org/notice"], "模型线索", now)!;

describe("赛期人工复核", () => {
  it("只创建同届真实日期候选，模型文字不构成自动批准", () => {
    expect(proposal.to).toBe("2026-11-08");
    expect(race.raceDate).toBe("2026-11-01");
    for (const value of ["2026-11-01", "2026-02-30", "2027-11-01", undefined]) expect(proposeDate(race, value, [], "官方确认", now)).toBeNull();
  });
  it("批准保存对应赛期证据和时间，不原地修改输入", () => {
    const [next] = approveDate([race], proposal, "https://example.org/notice", now);
    expect(next.raceDate).toBe("2026-11-08");
    expect(next.sources?.[0]).toEqual({ url: "https://example.org/notice", scope: "raceDate", observedAt: now, verifiedAt: now });
    expect(race.raceDate).toBe("2026-11-01");
  });
  it("没有证据、候选已过时或日期冲突都拒绝覆盖", () => {
    expect(() => approveDate([race], proposal, "", now)).toThrow("公告");
    expect(() => approveDate([{ ...race, raceDate: "2026-11-02" }], proposal, "https://example.org/notice", now)).toThrow("已变化");
    expect(() => approveDate([race], { ...proposal, to: "2026-10-20" }, "https://example.org/notice", now)).toThrow("截止");
  });
});
