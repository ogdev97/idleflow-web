"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { copilotBus } from "@/lib/copilotBus";

type Row = { name: string; platform: string; apy: number; tvl: number; lp: boolean; safe: boolean; note?: string };

const TOKENS = ["OKB", "XBTC", "XETH", "USDT", "USDG"] as const;
type Tok = (typeof TOKENS)[number];
const STABLE = new Set<Tok>(["USDT", "USDG"]);

function useRows(tok: Tok) {
  return useQuery<Row[]>({
    queryKey: ["topyield", tok],
    queryFn: async () => {
      if (STABLE.has(tok)) {
        const d = await api.yield(tok);
        return d.opportunities.map((o) => ({
          name: o.venue_name.replace(/ \(X Layer\)/, ""),
          platform: "Aave V3 · lending",
          apy: o.apy_pct,
          tvl: Number(o.tvl),
          lp: false,
          safe: (o.risk_score ?? 5) <= 1,
        }));
      }
      const d = await api.tokenYield(tok);
      return d.options
        .filter((o) => o.apy_pct != null && o.apy_pct > 0)
        .map((o) => ({
          name: o.name,
          platform: `${o.platform} · ${o.product_group.replace("_", " ").toLowerCase()}`,
          apy: o.apy_pct as number,
          tvl: o.tvl_usd,
          lp: o.is_lp,
          safe: false,
          note: o.risk_note,
        }))
        .sort((a, b) => b.apy - a.apy);
    },
  });
}

function apyClass(apy: number) {
  if (apy >= 20) return "text-emerald-300";
  if (apy >= 3) return "brand-text";
  return "text-[var(--muted)]";
}

export function TopYields() {
  const [tok, setTok] = useState<Tok>("OKB");
  const { data: rows, isLoading } = useRows(tok);
  const top = rows?.slice(0, 4) ?? [];

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Top yields · X Layer</div>
        <div className="text-[11px] text-[var(--muted)]">live</div>
      </div>

      {/* token selector */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TOKENS.map((t) => (
          <button
            key={t}
            onClick={() => setTok(t)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              tok === t ? "bg-[var(--brand)] font-medium text-[var(--brand-ink)]" : "border border-[var(--border-2)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* rows */}
      <div className="mt-3 flex flex-col gap-2">
        {isLoading && <div className="py-6 text-center text-xs text-[var(--muted)]">loading yields…</div>}
        {!isLoading && top.length === 0 && <div className="py-6 text-center text-xs text-[var(--muted)]">No yield found for {tok}.</div>}
        {top.map((r, i) => (
          <button
            key={i}
            onClick={() => {
              copilotBus.ask(
                STABLE.has(tok)
                  ? `What's the best ${tok} yield on X Layer?`
                  : `Find the best yield for ${tok} (I'm looking at ${r.name}).`,
              );
              document.getElementById("copilot")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            title="Ask the Copilot"
            className="group flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-left transition hover:border-[rgba(46,230,160,0.5)] hover:bg-[rgba(46,230,160,0.06)]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{r.name}</span>
                {i === 0 && r.apy >= 20 && <span className="rounded bg-[rgba(46,230,160,0.16)] px-1.5 py-0.5 text-[10px] brand-text">🔥 top</span>}
              </div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {r.platform}
                <span className="text-[var(--brand)] opacity-0 transition group-hover:opacity-100"> · ask ✦</span>
              </div>
            </div>
            <div className="ml-3 shrink-0 text-right">
              <div className={`text-lg font-semibold ${apyClass(r.apy)}`}>{r.apy.toFixed(2)}%</div>
              <div className="text-[10px]">
                {r.lp ? (
                  <span className="text-amber-400">LP · IL risk</span>
                ) : r.safe ? (
                  <span className="brand-text">safe</span>
                ) : (
                  <span className="text-[var(--muted)]">lending</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
        {STABLE.has(tok)
          ? "Stablecoin lending — one-click deposit below (non-custodial)."
          : "High-yield LP pools carry impermanent-loss risk. Ask the Copilot to prepare a safe move."}
      </div>
    </div>
  );
}
