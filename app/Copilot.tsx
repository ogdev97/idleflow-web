"use client";

import { useState } from "react";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWalletClient } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { payAndCallTool, routeIntent, USDT_ADDRESS, CALL_PRICE_USDT } from "@/lib/x402";
import { xLayer } from "@/lib/chains";

type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; service: string; result: unknown; paid: boolean }
  | { role: "error"; text: string };

const USE_CASES: { label: string; prompt: string }[] = [
  { label: "Best USDT yield", prompt: "What's the best USDT yield on X Layer?" },
  { label: "OKB token yield", prompt: "Find the best yield for OKB" },
  { label: "Stablecoin market", prompt: "How's the stablecoin market doing?" },
  { label: "Cross-chain route", prompt: "Quote a cross-chain route from X Layer to Base" },
  { label: "Guardian scan", prompt: "Is token 0x779ded0c9e1022225f8e0630b35a9b54be713736 safe?" },
  { label: "Yield autopilot", prompt: "Set up yield autopilot for my position" },
];

function Deliverable({ result }: { result: unknown }) {
  const r = result as Record<string, unknown>;
  const n = (v: unknown) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Array.isArray(r?.opportunities))
    return (
      <div className="flex flex-col gap-1.5">
        {(r.opportunities as Record<string, unknown>[]).map((o, i) => (
          <div key={i} className="flex justify-between">
            <span>{String(o.venue_name)}</span>
            <span className="brand-text">{String(o.apy_pct)}% · risk {String(o.risk_score)}</span>
          </div>
        ))}
      </div>
    );
  if (typeof r?.total_market_cap_usd === "number") {
    const x = r.xlayer as Record<string, unknown> | undefined;
    return <div>Total stablecoin cap <span className="brand-text">${n(r.total_market_cap_usd)}</span> · X Layer {String(x?.share_pct ?? "—")}%</div>;
  }
  if (r?.risk_level) return <div>Risk: <span className="brand-text">{String(r.risk_level)}</span>{r.is_honeypot ? " · ⚠ honeypot" : ""}</div>;
  if (Array.isArray(r?.options))
    return (
      <div className="flex flex-col gap-1.5">
        {(r.options as Record<string, unknown>[]).slice(0, 4).map((o, i) => (
          <div key={i} className="flex justify-between">
            <span>{String(o.name ?? o.protocol ?? "pool")}</span>
            <span className="brand-text">{String(o.apy_pct ?? o.apy ?? "")}%</span>
          </div>
        ))}
      </div>
    );
  return <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-[var(--muted)]">{JSON.stringify(r, null, 2).slice(0, 700)}</pre>;
}

export function Copilot() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const { data: usdtRaw } = useReadContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: xLayer.id,
    query: { enabled: isConnected && !!address, refetchInterval: 15_000 },
  });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const gated = !isConnected || !walletClient;
  const usdtBal = usdtRaw !== undefined ? Number(formatUnits(usdtRaw, 6)) : undefined;
  const underfunded = usdtBal !== undefined && usdtBal < CALL_PRICE_USDT;
  const blocked = busy || underfunded;

  async function ask(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    if (gated) {
      setTurns((t) => [...t, { role: "error", text: "Connect your OKX Wallet first — you pay 0.01 USDT per call, from your own wallet." }]);
      return;
    }
    if (underfunded) {
      setTurns((t) => [...t, { role: "error", text: `Fund your wallet first — you have ${usdtBal?.toFixed(4)} USDT, each call costs ${CALL_PRICE_USDT}. Send USD₮0 to your wallet on X Layer.` }]);
      return;
    }
    setInput("");
    setTurns((t) => [...t, { role: "user", text: msg }]);
    setBusy(true);
    try {
      if (chainId !== xLayer.id) await switchChainAsync({ chainId: xLayer.id });
      const { service, tool, args } = routeIntent(msg);
      const { result, paid } = await payAndCallTool(walletClient!, tool, args);
      setTurns((t) => [...t, { role: "assistant", service, result, paid }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "error", text: e instanceof Error ? e.message.slice(0, 120) : String(e) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[rgba(46,230,160,0.04)] px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[rgba(46,230,160,0.16)] brand-text">✦</span>
          <span className="text-lg font-semibold">Copilot</span>
          <span className="ml-auto text-xs text-[var(--muted)]">OKX agent layer · x402 · no LLM key</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
          <span>You pay 0.01 USDT per call from your own wallet — non-custodial.</span>
          {isConnected && (
            <span className="text-[var(--text)]">
              · Balance: <span className={underfunded ? "text-amber-400" : "brand-text"}>{usdtBal !== undefined ? usdtBal.toFixed(4) : "…"} USDT</span>
            </span>
          )}
        </div>
        {underfunded && (
          <div className="mt-2 rounded-lg bg-amber-950/50 px-3 py-1.5 text-xs text-amber-300">
            ⚠ Fund your wallet — send at least {CALL_PRICE_USDT} USD₮0 on X Layer to run the copilot.
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Use-case chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {USE_CASES.map((u) => (
            <button
              key={u.label}
              onClick={() => ask(u.prompt)}
              disabled={blocked}
              className="rounded-full border border-[var(--border-2)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[rgba(46,230,160,0.5)] hover:text-[var(--text)] disabled:opacity-40"
            >
              {u.label}
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div className="flex min-h-[220px] flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: "50vh" }}>
          {turns.length === 0 && (
            <div className="grid flex-1 place-items-center text-center text-sm text-[var(--muted)]">
              {gated ? (
                <span>Connect your OKX Wallet to start — each call costs you 0.01 USDT.</span>
              ) : (
                <span>Pick a use case above, or ask anything about X Layer yield.</span>
              )}
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "flex justify-end" : ""}>
              {t.role === "user" && <span className="btn-brand max-w-[80%] rounded-2xl px-3.5 py-2 text-sm">{t.text}</span>}
              {t.role === "assistant" && (
                <div className="max-w-[85%] rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                  <div className="mb-1.5 text-[11px] text-[var(--muted)]">
                    {t.service} · via OKX x402 {t.paid ? "· you paid 0.01 USDT" : "· free"}
                  </div>
                  <Deliverable result={t.result} />
                </div>
              )}
              {t.role === "error" && <span className="inline-block rounded-2xl bg-red-950/50 px-3.5 py-2 text-sm text-red-300">{t.text}</span>}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border-2)] border-t-[var(--brand)]" />
              Sign the 0.01 USDT payment in your wallet…
            </div>
          )}
        </div>

        {/* Input */}
        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder={gated ? "Connect wallet to use the copilot…" : "Ask the copilot…"}
            disabled={busy}
            className="flex-1 rounded-xl border border-[var(--border-2)] bg-[#0a0d12] px-4 py-3 text-sm outline-none transition focus:border-[rgba(46,230,160,0.6)] disabled:opacity-50"
          />
          <button onClick={() => ask(input)} disabled={busy} className="btn-brand px-5 py-3 text-sm disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
