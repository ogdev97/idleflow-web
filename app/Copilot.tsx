"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { payAndCallTool, routeIntent } from "@/lib/x402";
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
      <div className="flex flex-col gap-1">
        {(r.opportunities as Record<string, unknown>[]).map((o, i) => (
          <div key={i} className="flex justify-between">
            <span>{String(o.venue_name)}</span>
            <span className="text-emerald-400">{String(o.apy_pct)}% · risk {String(o.risk_score)}</span>
          </div>
        ))}
      </div>
    );
  if (typeof r?.total_market_cap_usd === "number") {
    const x = r.xlayer as Record<string, unknown> | undefined;
    return <div>Total stablecoin cap ${n(r.total_market_cap_usd)} · X Layer {String(x?.share_pct ?? "—")}%</div>;
  }
  if (r?.risk_level) return <div>Risk: <span className="text-emerald-400">{String(r.risk_level)}</span>{r.is_honeypot ? " · ⚠ honeypot" : ""}</div>;
  if (Array.isArray(r?.options))
    return (
      <div className="flex flex-col gap-1">
        {(r.options as Record<string, unknown>[]).slice(0, 4).map((o, i) => (
          <div key={i} className="flex justify-between">
            <span>{String(o.name ?? o.protocol ?? "pool")}</span>
            <span className="text-emerald-400">{String(o.apy_pct ?? o.apy ?? "")}%</span>
          </div>
        ))}
      </div>
    );
  return <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-neutral-300">{JSON.stringify(r, null, 2).slice(0, 700)}</pre>;
}

export function Copilot() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const gated = !isConnected || !walletClient;

  async function ask(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    if (gated) {
      setTurns((t) => [...t, { role: "error", text: "Connect your OKX Wallet first — you pay 0.01 USDT per call, from your own wallet." }]);
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
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <span className="text-emerald-400">✦</span>
        <span className="font-medium">Copilot</span>
        <span className="text-neutral-500">— powered by the OKX agent layer (x402), no LLM key</span>
      </div>
      <div className="mb-3 text-xs text-neutral-500">
        You pay 0.01 USDT per call from your OWN wallet — IdleFlow never holds your funds. Non-custodial.
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {USE_CASES.map((u) => (
          <button
            key={u.label}
            onClick={() => ask(u.prompt)}
            disabled={busy}
            className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:border-emerald-600 hover:text-white disabled:opacity-40"
          >
            {u.label}
          </button>
        ))}
      </div>

      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {turns.length === 0 && (
          <div className="text-sm text-neutral-500">
            {gated ? "Connect your OKX Wallet to start — each call costs you 0.01 USDT." : "Pick a use case above, or ask about X Layer yield."}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "text-right" : ""}>
            {t.role === "user" && <span className="inline-block rounded-2xl bg-emerald-600/90 px-3 py-2 text-sm text-white">{t.text}</span>}
            {t.role === "assistant" && (
              <div className="rounded-2xl bg-neutral-800/70 px-3 py-2.5 text-sm text-neutral-100">
                <div className="mb-1 text-xs text-neutral-500">
                  {t.service} · via OKX x402 {t.paid ? "· you paid 0.01 USDT" : "· free"}
                </div>
                <Deliverable result={t.result} />
              </div>
            )}
            {t.role === "error" && <span className="inline-block rounded-2xl bg-red-950/60 px-3 py-2 text-sm text-red-300">{t.text}</span>}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-600 border-t-emerald-500" />
            Sign the 0.01 USDT payment in your wallet…
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(input)}
          placeholder={gated ? "Connect wallet to use the copilot…" : "Ask the copilot…"}
          disabled={busy}
          className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-50"
        />
        <button
          onClick={() => ask(input)}
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </section>
  );
}
