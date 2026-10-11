"use client";

import type { Filters } from "@/lib/filters";

const controlCls = "min-h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200";

export default function FilterBar({ filters, regions, events, months, monthCounts, onChange, onReset }: {
  filters: Filters;
  regions: string[];
  events: string[];
  months: string[];
  monthCounts: (m: string) => number | undefined;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}) {
  const statusValue = filters.quick === "finished" ? "finished" : filters.status;
  const active = filters.region || filters.status || filters.event || filters.keyword || filters.quick !== "unfinished";
  const pickStatus = (value: string) => onChange(value === "finished"
    ? { status: "finished", quick: "finished" }
    : { status: value, quick: "unfinished" });

  return (
    <div className="rounded-2xl border border-orange-100 bg-white/90 p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">搜索赛事、城市或国家</span>
          <input type="search" placeholder="搜索赛事、城市、国家…" value={filters.keyword}
            onChange={e => onChange({ keyword: e.target.value })}
            className={`${controlCls} bg-orange-50/40`} />
        </label>
        {active && <button type="button" onClick={onReset}
          className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-orange-700 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-500">重置筛选</button>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="min-w-0"><span className="sr-only">赛事地区</span>
          <select className={controlCls} value={filters.region} onChange={e => onChange({ region: e.target.value })}>
            <option value="">全部地区</option>
            {regions.map(region => <option key={region} value={region}>{region}</option>)}
          </select>
        </label>
        <label className="min-w-0"><span className="sr-only">报名状态</span>
          <select className={controlCls} value={statusValue} onChange={e => pickStatus(e.target.value)}>
            <option value="">全部状态</option><option value="open">报名中</option>
            <option value="today">今日开跑</option><option value="drawing">抽签中</option>
            <option value="pending">筹备中</option><option value="closed">已截止</option><option value="finished">已结束</option>
          </select>
        </label>
        <label className="min-w-0"><span className="sr-only">参赛项目</span>
          <select className={controlCls} value={filters.event} onChange={e => onChange({ event: e.target.value })}>
            <option value="">全部项目</option>
            {[...new Set([...events, filters.event].filter(Boolean))].map(event => <option key={event} value={event}>{event}</option>)}
          </select>
        </label>
        <label className="min-w-0"><span className="sr-only">按月跳转</span>
          <select className={controlCls} value="" disabled={!months.length}
            onChange={e => { if (e.target.value) document.getElementById(`month-${e.target.value}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }}>
            <option value="">按月跳转</option>
            {months.map(month => <option key={month} value={month}>{month.slice(0, 4)}年{Number(month.slice(5))}月 · {monthCounts(month)} 场</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
