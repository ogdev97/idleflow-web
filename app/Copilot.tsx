"use client";

import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAccount, useChainId, useSwitchChain, useSendTransaction } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi";
import type { PreparedTx } from "@/lib/api";

type DepositPlanOut = {
  venue_name?: string;
  asset?: string;
  amount?: string;
  chain_id?: number;
  transactions?: PreparedTx[];
  error?: string;
  message?: string;
};

/** Signs a prepared deposit (approve then supply) from a copilot tool result. */
function SignDeposit({ plan }: { plan: DepositPlanOut }) {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const [status, setStatus] = useState<string>("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (plan.error || !plan.transactions?.length) {
    return <div className="mt-1 text-xs text-neutral-500">{plan.message || plan.error || "Nothing to sign."}</div>;
  }
  const target = (plan.chain_id ?? 196) as 196 | 1952;

  async function sign() {
    setBusy(true);
    setDone(false);
    try {
      if (chainId !== target) await switchChainAsync({ chainId: target });
      const txs = plan.transactions!;
      for (let i = 0; i < txs.length; i++) {
        const t = txs[i];
        setStatus(`${t.kind === "approve" ? "Approving" : "Supplying"} (${i + 1}/${txs.length}) — sign in wallet`);
        const hash = await sendTransactionAsync({ to: t.to, data: t.data, value: t.value ? BigInt(t.value) : BigInt(0) });
        setStatus(`Confirming ${t.kind}…`);
        await waitForTransactionReceipt(wagmiConfig, { hash });
      }
      setDone(true);
      setStatus("");
    } catch (e) {
      setStatus(`✕ ${(e instanceof Error ? e.message : String(e)).slice(0, 70)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-3">
      <div className="text-sm text-neutral-200">
        Deposit {plan.amount} {plan.asset} → {plan.venue_name}
      </div>
      {done ? (
        <div className="mt-1 text-sm text-emerald-300">Deposited — earning now. IdleFlow never held a cent.</div>
      ) : (
        <>
          <button
            onClick={sign}
            disabled={busy}
            className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Working…" : "Review & sign in wallet"}
          </button>
          {status && <div className="mt-1 text-xs text-neutral-400">{status}</div>}
        </>
      )}
    </div>
  );
}

export function Copilot() {
  const { address } = useAccount();
  const walletRef = useRef<string | undefined>(undefined);
  walletRef.current = address;

  const [transport] = useState(
    () => new DefaultChatTransport({ api: "/api/chat", body: () => ({ wallet: walletRef.current }) }),
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-emerald-400">✦</span>
        <span className="font-medium">Copilot</span>
        <span className="text-neutral-500">— ask it to find and earn yield</span>
      </div>

      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-sm text-neutral-500">
            Try: <span className="text-neutral-300">&ldquo;I have 100 USDT idle, earn it safely on X Layer&rdquo;</span>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={
                m.role === "user"
                  ? "inline-block rounded-2xl bg-emerald-600/90 px-3 py-2 text-sm text-white"
                  : "inline-block max-w-full rounded-2xl bg-neutral-800/70 px-3 py-2 text-sm text-neutral-100"
              }
            >
              {m.parts.map((part, i) => {
                if (part.type === "text") return <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
                if (part.type === "tool-prepare_deposit" && part.state === "output-available")
                  return <SignDeposit key={i} plan={part.output as DepositPlanOut} />;
                if (part.type.startsWith("tool-") && "state" in part && part.state !== "output-available")
                  return (
                    <div key={i} className="text-xs text-neutral-500">
                      · using {part.type.replace("tool-", "")}…
                    </div>
                  );
                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask the copilot…"
          className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
        />
        <button
          onClick={send}
          disabled={status === "streaming" || status === "submitted"}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </section>
  );
}
