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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your <span className="grad-text">money copilot</span> for X Layer.
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Ask for yield, safety, or market data — powered by the OKX agent layer. You pay per call, you sign, you keep custody.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* MAIN — Copilot */}
          <div className="lg:col-span-2">
            <Copilot />
          </div>

          {/* SUB — Top yields + earn + quick facts */}
          <aside className="flex flex-col gap-5">
            <TopYields />
            <DepositCard best={best} />

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
              <a href={OKX_AGENT_URL} target="_blank" rel="noopener" className="btn-ghost mt-4 block px-3 py-2 text-center text-sm">
                Open on OKX.AI ↗
              </a>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
