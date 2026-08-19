"use client";

import Link from "next/link";
import { OKX_AGENT_URL } from "@/lib/constants";
import { Logo } from "../Logo";
import { ConnectWallet } from "../ConnectWallet";
import { Sandbox } from "../Sandbox";
import { SandboxCopilot } from "../SandboxCopilot";

export default function AppPage() {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="glow glow-soft" />

      <header className="relative z-50 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
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

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-2">
        {/* HERO */}
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Put your idle stablecoins <span className="grad-text">to work</span> on X Layer.
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Try the full non-custodial earn flow with free test tokens — you sign, you keep custody.
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Sandbox />
          </div>
          <aside className="flex flex-col gap-5 lg:col-span-2">
            <SandboxCopilot />
            <div className="glass p-5 text-sm">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Why a testnet sandbox?</div>
              <ul className="mt-3 flex flex-col gap-2.5 text-[13px] text-[var(--muted)]">
                <li>🆓 <b className="text-[var(--text)]">Free test tokens</b> — mint tUSDT in one tap, no real money.</li>
                <li>✍️ <b className="text-[var(--text)]">You sign every step</b> — fully non-custodial, IdleFlow never holds your key.</li>
                <li>📈 <b className="text-[var(--text)]">Watch it earn</b> — the vault pays a live demo APR so you see yield accrue in real time.</li>
                <li>🔁 <b className="text-[var(--text)]">Withdraw anytime</b> — principal + demo yield back to your wallet.</li>
              </ul>
              <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-[12px] leading-relaxed text-[var(--muted)]">
                Powered by the same non-custodial engine AI agents pay to use on the OKX marketplace.
                <a href={OKX_AGENT_URL} target="_blank" rel="noopener" className="mt-2 block brand-text underline underline-offset-2">IdleFlow #4523 on OKX.AI ↗</a>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
