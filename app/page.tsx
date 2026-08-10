"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { api, type YieldResponse, type MarketOverview } from "@/lib/api";
import { xLayer } from "@/lib/chains";

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const yieldQ = useQuery<YieldResponse>({ queryKey: ["yield", "USDT"], queryFn: () => api.yield("USDT") });
  const marketQ = useQuery<MarketOverview>({ queryKey: ["market"], queryFn: () => api.market() });

  const best = yieldQ.data?.opportunities?.[0];
  const injected = connectors[0];

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 flex flex-col gap-10 text-neutral-100">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500">●</span>
          <span className="font-semibold">IdleFlow</span>
          <span className="text-xs text-neutral-500">X Layer money operations</span>
        </div>
        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            {short(address)} · disconnect
          </button>
        ) : (
          <button
            onClick={() => injected && connect({ connector: injected })}
            disabled={isPending || !injected}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? "Connecting…" : "Connect wallet"}
          </button>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Earn on your idle stablecoins.</h1>
        <p className="text-neutral-400">
          The best risk-adjusted yield on X Layer — one click, non-custodial. Your wallet signs; IdleFlow never holds
          your funds.
        </p>
      </section>

      {/* Best yield card — proves the backend read loop end to end */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        <div className="text-xs uppercase tracking-wide text-neutral-500">Best USDT yield · X Layer</div>
        {yieldQ.isLoading ? (
          <div className="mt-3 text-neutral-500">Loading live rates…</div>
        ) : yieldQ.error ? (
          <div className="mt-3 text-red-400">Couldn&apos;t reach IdleFlow API: {(yieldQ.error as Error).message}</div>
        ) : best ? (
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-4xl font-semibold text-emerald-400">{best.apy_pct}%</div>
              <div className="mt-1 text-sm text-neutral-400">{best.venue_name}</div>
            </div>
            <div className="text-right text-sm text-neutral-500">
              <div>risk {best.risk_score}/5</div>
              <div>TVL ${Number(best.tvl).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-neutral-500">No venue.</div>
        )}
        <button
          disabled
          className="mt-6 w-full rounded-xl bg-emerald-600/40 px-4 py-3 font-medium text-white/70"
          title="Deposit flow lands in Phase 1"
        >
          {isConnected ? "Deposit (Phase 1)" : "Connect wallet to deposit"}
        </button>
      </section>

      <footer className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          stablecoin market cap:{" "}
          {marketQ.data ? `$${(marketQ.data.total_market_cap_usd / 1e9).toFixed(0)}B` : "—"}
        </span>
        <span>
          chain {chainId}
          {isConnected && chainId !== xLayer.id && (
            <button onClick={() => switchChain({ chainId: xLayer.id })} className="ml-2 underline">
              switch to X Layer
            </button>
          )}
        </span>
      </footer>
    </main>
  );
}
