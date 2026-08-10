"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type YieldResponse, type MarketOverview } from "@/lib/api";
import { OKX_AGENT_URL } from "@/lib/constants";
import { Logo } from "./Logo";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass px-5 py-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--text)]">{value}</div>
      {sub && <div className="text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="glass glass-hover p-5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(46,230,160,0.12)] text-lg">{icon}</div>
      <div className="mt-3 font-medium">{title}</div>
      <div className="mt-1 text-sm text-[var(--muted)]">{body}</div>
    </div>
  );
}

export default function Landing() {
  const yieldQ = useQuery<YieldResponse>({ queryKey: ["yield", "USDT"], queryFn: () => api.yield("USDT") });
  const marketQ = useQuery<MarketOverview>({ queryKey: ["market"], queryFn: () => api.market() });
  const best = yieldQ.data?.opportunities?.[0];

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="glow" />
      <div className="grid-bg absolute inset-0" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3 text-sm">
          <a href={OKX_AGENT_URL} target="_blank" rel="noopener" className="hidden text-[var(--muted)] hover:text-[var(--text)] sm:inline">
            View on OKX.AI ↗
          </a>
          <Link href="/app" className="btn-brand px-4 py-2 text-sm">
            Launch app
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-14 pb-10 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)]">
          <span className="brand-text">●</span> Live on OKX.AI · agent #4523 · non-custodial
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Put your idle stablecoins <span className="grad-text">to work</span> on X Layer.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--muted)]">
          An AI copilot that finds the best yield, guards every move against scams, and prepares the transactions —
          your wallet signs. IdleFlow never holds your funds.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/app" className="btn-brand px-6 py-3 text-sm">
            Try IdleFlow →
          </Link>
          <a href={OKX_AGENT_URL} target="_blank" rel="noopener" className="btn-ghost px-6 py-3 text-sm">
            View on OKX.AI ↗
          </a>
        </div>

        {/* App preview card */}
        <div className="glass mx-auto mt-14 max-w-3xl overflow-hidden p-1.5 text-left">
          <div className="rounded-2xl bg-[#0a0d12] p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Best USDT yield · X Layer</div>
              <div className="text-xs text-[var(--muted)]">via OKX x402</div>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <div className="text-4xl font-semibold brand-text">{best ? `${best.apy_pct}%` : "—"}</div>
                <div className="text-sm text-[var(--muted)]">{best?.venue_name ?? "Aave V3 — USDT (X Layer)"}</div>
              </div>
              <div className="text-right text-xs text-[var(--muted)]">
                <div>risk {best?.risk_score ?? 1}/5</div>
                <div>TVL ${best ? Number(best.tvl).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm">
              <span className="brand-text">✦ Copilot</span>{" "}
              <span className="text-[var(--muted)]">“I have 100 USDT idle — earn it safely.”</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="relative z-10 mx-auto grid max-w-5xl grid-cols-2 gap-3 px-6 py-8 sm:grid-cols-4">
        <Stat label="Best stable APY" value={best ? `${best.apy_pct}%` : "—"} sub="Aave V3 · X Layer" />
        <Stat label="Stablecoin cap" value={marketQ.data ? `$${(marketQ.data.total_market_cap_usd / 1e9).toFixed(0)}B` : "—"} sub="live market" />
        <Stat label="Agent rating" value="5.0" sub="100% positive" />
        <Stat label="Custody" value="Yours" sub="non-custodial" />
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-center text-2xl font-semibold tracking-tight">One agent. Every money move on X Layer.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon="✦" title="AI Copilot" body="Ask in plain words. It finds yield, checks safety, and prepares the deposit you sign." />
          <Feature icon="📈" title="Best Yield" body="Ranked USDT/USDG/OKB yield across Aave, DEX pools and lending — with risk scores." />
          <Feature icon="🛡" title="Guardian" body="Scan any token, tx, or signature for honeypots and drains before you sign." />
          <Feature icon="⚡" title="Two-sided" body="The same engine other AI agents pay to use on OKX.AI — now working for you." />
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["1", "Connect", "Connect your OKX Wallet on X Layer. You keep custody."],
            ["2", "Ask the copilot", "Pay 0.01 USDT per call from your own wallet — via the OKX agent layer."],
            ["3", "Sign & earn", "Review the prepared transaction and sign. Your funds never leave your control."],
          ].map(([n, t, b]) => (
            <div key={n} className="glass p-5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[rgba(46,230,160,0.14)] text-sm font-semibold brand-text">{n}</div>
              <div className="mt-3 font-medium">{t}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{b}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/app" className="btn-brand px-7 py-3 text-sm">
            Try IdleFlow now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-8 text-sm text-[var(--muted)] sm:flex-row">
        <Logo size={22} />
        <div className="flex items-center gap-4">
          <a href={OKX_AGENT_URL} target="_blank" rel="noopener" className="hover:text-[var(--text)]">OKX.AI ↗</a>
          <Link href="/app" className="hover:text-[var(--text)]">Launch app</Link>
          <span>Non-custodial · X Layer</span>
        </div>
      </footer>
    </div>
  );
}
