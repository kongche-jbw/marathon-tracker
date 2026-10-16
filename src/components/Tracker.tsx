"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Race } from "@/types/race";
import { deriveStatus, computeStats } from "@/lib/status";
import StatsBar from "./StatsBar";
import FilterBar from "./FilterBar";
import { DEFAULT_FILTERS, filterRaces, parseRaceView, serializeRaceView, type RaceView } from "@/lib/filters";
import RaceCard from "./RaceCard";
import RegistrationList from "./RegistrationList";

const subscribeToUrl = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  window.addEventListener("race-filters-change", listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener("race-filters-change", listener);
  };
};
const getSearch = () => window.location.search;
const getServerSearch = () => "";

/** 备案号预留位：完成 ICP 备案后填入备案号（如 "京ICP备XXXXXXXX号"），页脚会自动展示 */
const ICP_NUMBER = "";

export default function Tracker({ races, nowIso }: { races: Race[]; nowIso: string }) {
  // 页面是构建时一次性生成的静态页，nowIso 只代表构建那一刻，只用作首屏兜底；
  // 挂载后换成访客本机的当前时间，并每分钟对齐一次（标签页一直开着过零点也能准）。
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    const sync = () => setNow(new Date());
    sync();
    const timer = setInterval(sync, 60_000);
    return () => clearInterval(timer);
  }, []);
  const search = useSyncExternalStore(subscribeToUrl, getSearch, getServerSearch);
  const view = useMemo(() => parseRaceView(search), [search]);
  const { tab, filters } = view;
  const setView = (next: RaceView, replace = false) => {
    const query = serializeRaceView(next, window.location.search);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    window.history[replace ? "replaceState" : "pushState"](window.history.state, "", url);
    window.dispatchEvent(new Event("race-filters-change"));
  };
  const resetFilters = () => setView({ tab, filters: DEFAULT_FILTERS });
  useEffect(() => {
    const toolbar = document.querySelector<HTMLElement>(".race-filter-toolbar");
    if (!toolbar) return;
    const update = () => document.documentElement.style.setProperty("--race-filter-height", `${toolbar.getBoundingClientRect().height + 16}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(toolbar);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--race-filter-height"); };
  }, []);
  // 返回顶部：滚动超过一屏后显示悬浮按钮
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const domestic = useMemo(() => races.filter(r => r.country === "中国"), [races]);
  const international = useMemo(() => races.filter(r => r.country !== "中国"), [races]);
  const tabRaces = tab === "domestic" ? domestic : international;

  const stats = useMemo(() => computeStats(tabRaces, now), [tabRaces, now]);
  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const r of tabRaces) {
      const region = tab === "domestic" ? r.province : r.country;
      if (region) set.add(region);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [tabRaces, tab]);

  const events = useMemo(() => [...new Set(tabRaces.flatMap(r => r.events))].sort(), [tabRaces]);
  const filtered = useMemo(() => filterRaces(races, view, now), [races, view, now]);

  // 今日开跑：比赛日当天的赛事单独成组置顶（当天不再标"已结束"）
  const racingToday = useMemo(
    () => filtered.filter(r => deriveStatus(r, now) === "today"),
    [filtered, now],
  );
  // 报名雷达：报名中的赛事置顶横滑，按截止紧迫度排序
  const openRaces = useMemo(
    () => filtered.filter(r => deriveStatus(r, now) === "open"),
    [filtered, now],
  );
  // 月份分组：筹备/抽签/已截止的未开赛赛事
  const upcoming = useMemo(
    () => filtered.filter(r => ["pending", "drawing", "closed"].includes(deriveStatus(r, now)))
      .sort((a, b) => a.raceDate.localeCompare(b.raceDate)),
    [filtered, now],
  );
  const finished = useMemo(
    () => filtered.filter(r => deriveStatus(r, now) === "finished")
      .sort((a, b) => b.raceDate.localeCompare(a.raceDate)),
    [filtered, now],
  );
  const monthOptions = useMemo(() => [...new Set(filterRaces(races, { tab, filters: { ...filters, month: "" } }, now).map(r => r.raceDate.slice(0, 7)))].sort(), [races, tab, filters, now]);
  const months = useMemo(() => [...new Set(upcoming.map(r => r.raceDate.slice(0, 7)))], [upcoming]);
  const byMonth = useMemo(() => {
    const map = new Map<string, Race[]>();
    for (const r of upcoming) {
      const m = r.raceDate.slice(0, 7);
      map.set(m, [...(map.get(m) ?? []), r]);
    }
    return map;
  }, [upcoming]);

  return (
    <div className="min-h-screen bg-orange-50">
      {/* 品牌头图：21:9 宽幅 banner（源自朋友圈主图素材），底部淡出已做进图片本体 */}
      <header>
        <h1 className="sr-only">国内外马拉松赛事追踪 — 愿你每一次奔跑，都是 Personal Best</h1>
        <img
          src="/hero.jpg"
          alt="国内外马拉松赛事追踪 — Run Your Personal Best，愿你每一次奔跑都是自己的 PB"
          className="block w-full"
        />
      </header>

      <main className="mx-auto mt-6 max-w-6xl px-4 pb-10">
        {/* 国内 / 国际切换：小按钮置于统计卡片上方 */}
        <div className="mb-2 flex gap-1.5">
          {([["domestic", "🇨🇳 全国赛事"], ["international", "🌍 国际赛事"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setView({ tab: k, filters: DEFAULT_FILTERS })}
              aria-pressed={tab === k}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition-colors lg:px-4 lg:py-1.5 lg:text-sm ${
                tab === k ? "bg-orange-500 text-white shadow-sm" : "border border-orange-200 bg-white text-slate-600 hover:bg-orange-50"
              }`}
            >
              {label}
              <span className="ml-1 opacity-70">{k === "domestic" ? domestic.length : international.length}</span>
            </button>
          ))}
        </div>
        <StatsBar open={stats.open} drawing={stats.drawing} races={tabRaces} now={now} deployedAt={nowIso} />

        {/* 先筛选再浏览：手机上无需越过整排报名卡片寻找搜索框。 */}
        <section aria-label="筛选赛事" className="race-filter-toolbar sticky top-0 z-10 -mx-4 mt-4 bg-orange-50/90 px-4 py-2 backdrop-blur-xl">
          <FilterBar filters={filters} regions={regions} events={events} months={monthOptions}
            onChange={patch => setView({ tab, filters: { ...filters, ...patch } }, "keyword" in patch)}
            onReset={resetFilters} />
          <p role="status" aria-live="polite" aria-atomic="true" className="px-1 pt-2 text-xs text-slate-600">
            找到 {filtered.length} 场赛事 · {tab === "domestic" ? "全国" : "国际"} · {filters.quick === "finished" ? "已结束" : filters.quick === "all" ? "全部赛期" : "未结束"}
          </p>
        </section>

        {/* 今日开跑：比赛当天的赛事单独成组 */}
        {racingToday.length > 0 && (
          <section className="mt-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 lg:text-xl">
              🏃 今日开跑
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">{racingToday.length}</span>
            </h2>
            <div className="mt-3 space-y-3">
              {racingToday.map(r => <RaceCard key={r.id} race={r} now={now} />)}
            </div>
          </section>
        )}

        <RegistrationList races={openRaces} now={now} />

        {/* 月份分组列表 */}
        {months.map(m => (
          <section key={m} id={`month-${m}`} className="race-month-section mt-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 lg:text-xl">
              🗓️ {m.slice(0, 4)}年{Number(m.slice(5))}月
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">{byMonth.get(m)?.length}</span>
            </h2>
            <div className="mt-3 space-y-3">
              {byMonth.get(m)?.map(r => <RaceCard key={r.id} race={r} now={now} />)}
            </div>
          </section>
        ))}

        {/* 已结束赛事：沉底弱展示 */}
        {finished.length > 0 && (
          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-400 lg:text-xl">
              🏁 已结束
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-400">{finished.length}</span>
            </h2>
            <div className="mt-3 space-y-2">
              {finished.map(r => <RaceCard key={r.id} race={r} now={now} />)}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-orange-200 bg-white p-12 text-center text-slate-400">
            <p>🔍 没有符合条件的赛事</p>
            <p className="mt-2 text-sm">试试搜索城市或国家，或减少筛选条件。</p>
            <button type="button" onClick={resetFilters} className="mt-4 min-h-11 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600">重置筛选</button>
          </div>
        )}

        <footer className="mt-12 border-t border-orange-100 pt-6 text-center">
          <p className="text-base font-semibold text-orange-500">愿您下一次冲线，都是自己的 Personal Best 🏅</p>
          <p className="mt-2 text-xs text-slate-400">
            为爱发电 · 数据每日更新 · 数据以组委会官方公告为准 ·{" "}
            <a href="https://github.com/shirlytomato/marathon-tracker" target="_blank" rel="noreferrer"
               className="text-slate-500 underline decoration-dotted hover:text-orange-500">GitHub 开源</a>
          </p>
          {ICP_NUMBER && <p className="mt-1 text-xs text-slate-400">{ICP_NUMBER}</p>}
        </footer>
      </main>

      {/* 返回顶部：月份导航跳转后可一键回顶 */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="返回顶部"
          className="fixed bottom-6 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-lg text-white shadow-lg transition-colors hover:bg-orange-600 sm:right-6"
        >
          ↑
        </button>
      )}
    </div>
  );
}
