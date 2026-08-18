"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type YieldResponse } from "@/lib/api";
import { OKX_AGENT_URL } from "@/lib/constants";
import { Logo } from "../Logo";
import { ConnectWallet } from "../ConnectWallet";
import { Copilot } from "../Copilot";
import { DepositCard } from "../DepositCard";
import { TopYields } from "../TopYields";
import { AutoSwitchChain } from "../AutoSwitchChain";

export default function AppPage() {
  const yieldQ = useQuery<YieldResponse>({ queryKey: ["yield", "ALL"], queryFn: () => api.yield() });
  const best = yieldQ.data?.opportunities?.[0];

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="glow glow-soft" />

      <header className="relative z-50 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="opacity-90 hover:opacity-100">
          <Logo />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <a href={OKX_AGENT_URL} target="_blank" rel="noopener" className="hidden text-[var(--muted)] hover:text-[var(--text)] sm:inline">
            View on OKX.AI ↗
          </a>
          <ConnectWallet />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-2">
        <AutoSwitchChain />

        {/* HERO — the main job: find the best yield, deposit in one click. */}
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Find the best <span className="grad-text">X Layer yield</span>. Deposit in one click.
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Live APY across X Layer, scam-guarded, non-custodial — you sign, you keep custody. IdleFlow never holds a cent.
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-5">
          {/* Discovery — best yields */}
          <div className="lg:col-span-3">
            <TopYields />
          </div>
          {/* Action — one-click deposit */}
          <div className="lg:col-span-2">
            <DepositCard best={best} />
          </div>
        </section>

        {/* SECONDARY — AI copilot + the other services (Guardian, Market, Cross-chain, Token yield). */}
        <div className="mb-4 mt-10 flex items-center gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">More tools</h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[11px] text-[var(--muted)]">Safety scans · market · cross-chain · any-token yield</span>
        </div>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Copilot />
          </div>

          <aside className="flex flex-col gap-5">
            <div className="glass p-5 text-sm">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">IdleFlow on OKX.AI</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[var(--muted)]">Agent</span>
                <span>#4523 · ⭐ 5.0</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[var(--muted)]">Services</span>
                <span>6 live</span>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted)]">
                The same money engine AI agents pay to use on the OKX marketplace — now yours in one click.
              </p>
              <a href={OKX_AGENT_URL} target="_blank" rel="noopener" className="btn-ghost mt-4 block px-3 py-2 text-center text-sm">
                Open on OKX.AI ↗
              </a>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
