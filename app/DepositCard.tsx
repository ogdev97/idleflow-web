"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain, useSendTransaction } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { api, type YieldVenue } from "@/lib/api";
import { wagmiConfig } from "@/lib/wagmi";

type Step = { label: string; hash?: `0x${string}`; status: "pending" | "signing" | "confirming" | "done" | "error"; error?: string };

export function DepositCard({ best }: { best?: YieldVenue }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();

  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const targetChain = (best?.chain_id ?? 196) as 196 | 1952;
  const canDeposit = isConnected && !!address && Number(amount) > 0 && !busy;

  async function deposit() {
    if (!address) return;
    setBusy(true);
    setDone(false);
    setSteps([]);
    try {
      if (chainId !== targetChain) await switchChainAsync({ chainId: targetChain });

      const plan = await api.prepareDeposit({ wallet: address, asset: best?.asset ?? "USDT", amount });
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
    <div>
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          placeholder={`Amount (${best?.asset ?? "USDT"})`}
          className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-emerald-600"
        />
        <button
          onClick={deposit}
          disabled={!canDeposit}
          className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {busy ? "Working…" : isConnected ? "Deposit" : "Connect wallet"}
        </button>
      </div>

      {steps.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                className={
                  s.status === "done"
                    ? "text-emerald-400"
                    : s.status === "error"
                      ? "text-red-400"
                      : "text-neutral-400"
                }
              >
                {s.status === "done" ? "✓" : s.status === "error" ? "✕" : "○"}
              </span>
              <span className="text-neutral-300">{s.label}</span>
              <span className="text-neutral-500">
                {s.status === "signing" && "— sign in wallet"}
                {s.status === "confirming" && "— confirming…"}
                {s.status === "error" && `— ${s.error?.slice(0, 60)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {done && (
        <div className="mt-3 rounded-lg bg-emerald-950/60 px-4 py-2 text-sm text-emerald-300">
          Deposited. Your {best?.asset ?? "USDT"} is now earning — and IdleFlow never held a cent of it.
        </div>
      )}
    </div>
  );
}
