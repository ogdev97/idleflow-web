"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain, useSendTransaction } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useQuery } from "@tanstack/react-query";
import { api, type YieldResponse, type YieldVenue, type MarketTrends } from "@/lib/api";
import { wagmiConfig } from "@/lib/wagmi";
import { AreaChart } from "./AreaChart";

type Step = { label: string; hash?: `0x${string}`; status: "pending" | "signing" | "confirming" | "done" | "error"; error?: string };
type Asset = "USDT" | "USDG";

export function DepositCard({ best }: { best?: YieldVenue }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const trendsQ = useQuery<MarketTrends>({ queryKey: ["trends", 30], queryFn: () => api.trends(30) });
  const series = trendsQ.data?.points.map((p) => p.mcap_usd) ?? [];
  const { sendTransactionAsync } = useSendTransaction();

  // USDG default — its Aave APY beats USDT's.
  const [asset, setAsset] = useState<Asset>("USDG");
  const selQ = useQuery<YieldResponse>({ queryKey: ["yield", asset], queryFn: () => api.yield(asset) });
  const sel = selQ.data?.opportunities?.[0] ?? (asset === (best?.asset as Asset) ? best : undefined);

  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const targetChain = (sel?.chain_id ?? 196) as 196 | 1952;
  const canDeposit = isConnected && !!address && Number(amount) > 0 && !busy;

  async function deposit() {
    if (!address) return;
    setBusy(true);
    setDone(false);
    setSteps([]);
    try {
      if (chainId !== targetChain) await switchChainAsync({ chainId: targetChain });

      const plan = await api.prepareDeposit({ wallet: address, asset, amount });
      const txs = plan.transactions;
      setSteps(txs.map((t) => ({ label: t.kind === "approve" ? "Approve" : "Supply to Aave", status: "pending" })));

      for (let i = 0; i < txs.length; i++) {
        const t = txs[i];
        setSteps((s) => s.map((x, j) => (j === i ? { ...x, status: "signing" } : x)));
        const hash = await sendTransactionAsync({
          to: t.to,
          data: t.data,
          value: t.value ? BigInt(t.value) : BigInt(0),
        });
        setSteps((s) => s.map((x, j) => (j === i ? { ...x, hash, status: "confirming" } : x)));
        await waitForTransactionReceipt(wagmiConfig, { hash });
        setSteps((s) => s.map((x, j) => (j === i ? { ...x, status: "done" } : x)));
      }
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSteps((s) => (s.length ? s.map((x) => (x.status === "signing" || x.status === "confirming" ? { ...x, status: "error", error: msg } : x)) : [{ label: "Deposit", status: "error", error: msg }]));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Safe deposit · 1-click</div>
        {/* stablecoin toggle */}
        <div className="flex gap-1">
          {(["USDG", "USDT"] as Asset[]).map((a) => (
            <button
              key={a}
              onClick={() => setAsset(a)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${
                asset === a ? "bg-[var(--brand)] font-medium text-[var(--brand-ink)]" : "border border-[var(--border-2)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="text-3xl font-semibold brand-text">{sel ? `${sel.apy_pct}%` : "—"}</div>
          <div className="text-xs text-[var(--muted)]">{sel?.venue_name ?? `Aave V3 — ${asset} (X Layer)`}</div>
        </div>
        <div className="text-right text-[11px] text-[var(--muted)]">
          <div>risk {sel?.risk_score ?? 1}/5</div>
          <div>non-custodial</div>
        </div>
      </div>

      <div className="mt-3">
        <AreaChart data={series} height={52} showDot={false} strokeWidth={1.6} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          placeholder={`Amount (${asset})`}
          className="w-full flex-1 rounded-xl border border-[var(--border-2)] bg-[#0a0d12] px-4 py-3 text-sm outline-none transition focus:border-[rgba(46,230,160,0.6)]"
        />
      </div>
      <button onClick={deposit} disabled={!canDeposit} className="btn-brand mt-2 w-full px-4 py-3 text-sm disabled:opacity-40">
        {busy ? "Working…" : isConnected ? "Deposit" : "Connect wallet to deposit"}
      </button>

      {steps.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={s.status === "done" ? "brand-text" : s.status === "error" ? "text-red-400" : "text-[var(--muted)]"}>
                {s.status === "done" ? "✓" : s.status === "error" ? "✕" : "○"}
              </span>
              <span className="text-[var(--text)]">{s.label}</span>
              <span className="text-[var(--muted)]">
                {s.status === "signing" && "— sign in wallet"}
                {s.status === "confirming" && "— confirming…"}
                {s.status === "error" && `— ${s.error?.slice(0, 60)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {done && (
        <div className="mt-3 rounded-lg bg-[rgba(46,230,160,0.12)] px-4 py-2 text-sm brand-text">
          Deposited. Your {asset} is now earning — IdleFlow never held a cent.
        </div>
      )}
    </div>
  );
}
