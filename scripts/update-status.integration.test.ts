import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const repo = resolve(".");
const race = { id: "a", name: "fixture", country: "中国", raceDate: "2099-11-01", regStatus: "open", events: ["全程马拉松"], category: "B", updatedAt: "2026-10-01T00:00:00Z" };
const health = { lastSuccessfulRun: "2026-10-01T00:00:00Z", lastRun: null };

describe("update-status 发布状态（隔离目录和网络）", () => {
  for (const [mode, args] of [["success", []], ["mixed", []], ["failure", []], ["success", ["--dry-run"]], ["success", ["--limit=1"]]] as const) {
    it(`${mode} ${args.join(" ")}`, () => {
      const root = mkdtempSync(join(tmpdir(), "race-health-"));
      try {
        mkdirSync(join(root, "data"));
        const races = [race, { ...race, id: "b" }];
        writeFileSync(join(root, "data/races.json"), JSON.stringify(races));
        writeFileSync(join(root, "data/update-health.json"), JSON.stringify(health));
        const mock = join(root, "mock.mjs");
        writeFileSync(mock, `let calls=0; globalThis.fetch=async()=>{
          calls++; const fail=process.env.FIXTURE_MODE==='failure'||(process.env.FIXTURE_MODE==='mixed'&&calls===2);
          return {ok:!fail,status:fail?401:200,text:async()=>"fixture rejected",json:async()=>({usage:{prompt_tokens:1000},choices:[{message:{content:JSON.stringify({regStatus:"open",note:"fixture"})}}]})};
        };`);
        const run = spawnSync(join(repo, "node_modules/.bin/tsx"), ["--import", mock, join(repo, "scripts/update-status.ts"), ...args], {
          cwd: root, env: { ...process.env, DASHSCOPE_API_KEY: "fixture", FIXTURE_MODE: mode }, encoding: "utf8", timeout: 10000,
        });
        expect(run.status, run.stdout + run.stderr).toBe(mode === "failure" ? 1 : 0);
        const after = JSON.parse(readFileSync(join(root, "data/update-health.json"), "utf8"));
        if (args.length) expect(after).toEqual(health);
        else {
          expect([after.lastRun.succeeded, after.lastRun.failed]).toEqual(mode === "success" ? [2, 0] : mode === "mixed" ? [1, 1] : [0, 2]);
          expect(after.lastSuccessfulRun !== health.lastSuccessfulRun).toBe(mode === "success");
        }
        if (args.some(arg => arg === "--dry-run")) expect(JSON.parse(readFileSync(join(root, "data/races.json"), "utf8"))).toEqual(races);
      } finally { rmSync(root, { recursive: true, force: true }); }
    });
  }
});
