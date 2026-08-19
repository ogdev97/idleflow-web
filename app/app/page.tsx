"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSwitchChain } from "wagmi";
import { api, type YieldResponse } from "@/lib/api";
import { OKX_AGENT_URL } from "@/lib/constants";
import { xLayer, xLayerTestnet } from "@/lib/chains";
import { Logo } from "../Logo";
import { ConnectWallet } from "../ConnectWallet";
import { Copilot } from "../Copilot";
import { DepositCard } from "../DepositCard";
import { TopYields } from "../TopYields";
import { Sandbox } from "../Sandbox";
import { AutoSwitchChain } from "../AutoSwitchChain";

type View = "testnet" | "mainnet";

export default function AppPage() {
  const yieldQ = useQuery<YieldResponse>({ queryKey: ["yield", "ALL"], queryFn: () => api.yield() });
  const best = yieldQ.data?.opportunities?.[0];
  const { switchChain } = useSwitchChain();
  const [view, setView] = useState<View>("testnet"); // sandbox is the main flow for now

  function pick(v: View) {
    setView(v);
    switchChain?.({ chainId: v === "testnet" ? xLayerTestnet.id : xLayer.id });
  }

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
        {view === "mainnet" && <AutoSwitchChain />}

        {/* HERO */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Put your idle stablecoins <span className="grad-text">to work</span> on X Layer.
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {view === "testnet"
                ? "Try the full non-custodial earn flow with free test tokens — you sign, you keep custody."
                : "Live APY across X Layer, scam-guarded, non-custodial. IdleFlow never holds a cent."}
            </p>
          </div>
          {/* network toggle */}
          <div className="flex items-center rounded-full border border-[var(--border-2)] p-0.5 text-xs">
            {([["testnet", "🧪 Testnet sandbox"], ["mainnet", "Mainnet"]] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => pick(v)}
                className={`rounded-full px-3 py-1.5 transition ${view === v ? "bg-[var(--brand)] font-medium text-[var(--brand-ink)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {view === "testnet" ? (
          <section className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <Sandbox />
            </div>
            <aside className="lg:col-span-2">
              <div className="glass p-5 text-sm">
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Why a testnet sandbox?</div>
                <ul className="mt-3 flex flex-col gap-2.5 text-[13px] text-[var(--muted)]">
                  <li>🆓 <b className="text-[var(--text)]">Free test tokens</b> — mint tUSDT in one tap, no real money.</li>
                  <li>✍️ <b className="text-[var(--text)]">You sign every step</b> — same non-custodial flow as mainnet.</li>
                  <li>📈 <b className="text-[var(--text)]">Watch it earn</b> — the vault pays a live demo APR so you see yield accrue.</li>
                  <li>🔁 <b className="text-[var(--text)]">Withdraw anytime</b> — principal + demo yield back to your wallet.</li>
                </ul>
                <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted)]">
                  Ready for the real thing? Switch to <button onClick={() => pick("mainnet")} className="brand-text underline underline-offset-2">Mainnet</button> for real Aave V3 yield on X Layer.
                </p>
              </div>
            </aside>
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <TopYields />
            </div>
            <div className="lg:col-span-2">
              <DepositCard best={best} />
            </div>
          </section>
        )}

        {/* SECONDARY — AI copilot + the other services. */}
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
