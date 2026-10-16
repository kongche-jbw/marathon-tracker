// 人工先阅读公告，再传 --id 与 --source；默认只预览，--apply 才落盘，不推送。
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import type { Race } from "../src/types/race";
import { approveDate, type DateProposal } from "./lib/date-review";
import { loadSchema, schemaIssues } from "./lib/schema";
const arg = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const write = (path: string, value: unknown) => {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2) + "\n");
  renameSync(temp, path);
};
const queue: DateProposal[] = read("data/pending-reviews.json");
if (!arg("id")) {
  console.log(JSON.stringify(queue, null, 2));
} else {
  const proposal = queue.find(item => item.id === arg("id"));
  if (!proposal) throw new Error("找不到该候选；不修改数据");
  const now = new Date().toISOString();
  const races: Race[] = read("data/races.json");
  const next = approveDate(races, proposal, arg("source") ?? "", now);
  const issues = schemaIssues(next as unknown as Record<string, unknown>[], loadSchema());
  if (issues.length) throw new Error(issues.join("\n"));
  console.log(`${proposal.raceId}: ${proposal.from} → ${proposal.to}，公告：${arg("source")}`);
  if (process.argv.includes("--apply")) {
    // 历史先记录原值与证据；中途失败即使候选仍在，旧值检查也会阻止二次覆盖。
    const history = read("data/review-history.json");
    write("data/review-history.json", [...history, { ...proposal, sourceUrl: arg("source"), reviewedAt: now }]);
    write("data/races.json", next);
    write("data/pending-reviews.json", queue.filter(item => item.id !== proposal.id));
    console.log("已更新本地文件；请检查 diff、运行发布校验并提交上述三个数据文件。");
  } else console.log("仅预览，未写文件；确认已阅读公告后加 --apply。");
}
