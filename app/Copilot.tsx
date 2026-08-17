"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { erc20Abi, formatUnits } from "viem";
import { payAndCallTool, routeIntent, USDT_ADDRESS, CALL_PRICE_USDT } from "@/lib/x402";
import { copilotBus } from "@/lib/copilotBus";
import { wagmiConfig } from "@/lib/wagmi";
import { xLayer } from "@/lib/chains";

type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; service: string; result: unknown; paid: boolean }
  | { role: "error"; text: string };

const USE_CASES: { icon: string; label: string; sub: string; prompt: string }[] = [
  { icon: "📈", label: "Best stable yield", sub: "top USDT/USDG APY", prompt: "What's the best stablecoin yield on X Layer?" },
  { icon: "🔶", label: "OKB & token yield", sub: "higher, riskier", prompt: "Find the best yield for OKB" },
  { icon: "🌍", label: "Market pulse", sub: "live stablecoin market", prompt: "How's the stablecoin market doing?" },
  { icon: "🌉", label: "Cross-chain", sub: "bridge route quote", prompt: "Quote a cross-chain route from X Layer to Base" },
  { icon: "🛡️", label: "Guardian scan", sub: "honeypot / scam check", prompt: "Is token 0x779ded0c9e1022225f8e0630b35a9b54be713736 safe?" },
  { icon: "🤖", label: "Autopilot", sub: "auto-rebalance policy", prompt: "Set up yield autopilot for my position" },
];

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

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
  const { data: usdtRaw } = useReadContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: xLayer.id,
    query: { enabled: isConnected && !!address, refetchInterval: 12_000 },
  });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const gated = !isConnected || !address;
  const usdtBal = usdtRaw !== undefined ? Number(formatUnits(usdtRaw, 6)) : undefined;
  const underfunded = !gated && usdtBal !== undefined && usdtBal < CALL_PRICE_USDT;
  const blocked = busy || gated || underfunded;

  function copyAddr() {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Let other components (Top Yields) drive the copilot. Ref so the bus always
  // calls the latest ask (with current gated/balance state).
  const askRef = useRef<(t: string) => void>(() => {});
  useEffect(() => {
    copilotBus.setHandler((p) => askRef.current(p));
    return () => copilotBus.setHandler(null);
  }, []);

  async function ask(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    if (gated) {
      setTurns((t) => [...t, { role: "error", text: "Connect your OKX Wallet first — you pay 0.01 USDT per call, from your own wallet." }]);
      return;
    }
    if (underfunded) {
      setTurns((t) => [...t, { role: "error", text: `Fund your connected wallet first — it has ${usdtBal?.toFixed(4)} USDT, each call costs ${CALL_PRICE_USDT}. Send USDT to ${address}.` }]);
      return;
    }
    setInput("");
    setTurns((t) => [...t, { role: "user", text: msg }]);
    setBusy(true);
    try {
      if (chainId !== xLayer.id) {
        try {
          await switchChainAsync({ chainId: xLayer.id });
        } catch {
          throw new Error("Switch your wallet to X Layer to continue.");
        }
      }
      // Fetch the wallet client fresh (the hook can be null when the wallet's
      // active chain differs). This is what signs the x402 payment.
      let wc;
      try {
        wc = await getWalletClient(wagmiConfig, { chainId: xLayer.id });
      } catch {
        throw new Error("Your wallet isn't on X Layer yet — approve the network switch and try again.");
      }
      if (!wc) throw new Error("Wallet client unavailable — reconnect your wallet and try again.");
      const { service, tool, args } = routeIntent(msg);
      const { result, paid } = await payAndCallTool(wc, tool, args);
      setTurns((t) => [...t, { role: "assistant", service, result, paid }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "error", text: e instanceof Error ? e.message.slice(0, 140) : String(e) }]);
    } finally {
      setBusy(false);
    }
  }

  askRef.current = ask;

  return (
    <section id="copilot" className="glass overflow-hidden">
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

        {/* Funding banner — shows exactly which address to fund (the connected wallet) */}
        {underfunded && (
          <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
            <div className="font-medium">⚠ Fund this wallet to run the copilot</div>
            <div className="mt-1 text-amber-200/80">
              The copilot pays from your <span className="font-medium">connected wallet</span> — there is no separate agent wallet.
              Send at least {CALL_PRICE_USDT} USDT (token{" "}
              <span className="font-mono">0x779d…6d22</span>) on X Layer to:
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="rounded bg-black/40 px-2 py-1 font-mono text-[11px] text-amber-100">{address}</code>
              <button onClick={copyAddr} className="rounded border border-amber-500/30 px-2 py-1 text-[11px] hover:bg-amber-500/10">
                {copied ? "copied ✓" : "copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Use-case cards */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {USE_CASES.map((u) => (
            <button
              key={u.label}
              onClick={() => ask(u.prompt)}
              disabled={blocked}
              className="group flex items-start gap-2.5 rounded-xl border border-[var(--border-2)] bg-[var(--panel)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[rgba(46,230,160,0.5)] hover:bg-[rgba(46,230,160,0.06)] disabled:pointer-events-none disabled:opacity-40"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[rgba(46,230,160,0.12)] text-base transition group-hover:scale-110">
                {u.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[var(--text)]">{u.label}</span>
                <span className="block truncate text-[11px] text-[var(--muted)]">{u.sub}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div className="flex min-h-[220px] flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: "50vh" }}>
          {turns.length === 0 && (
            <div className="grid flex-1 place-items-center text-center text-sm text-[var(--muted)]">
              {gated ? (
                <span>Connect your OKX Wallet to start — each call costs you 0.01 USDT.</span>
              ) : underfunded ? (
                <span>Fund your connected wallet above, then pick a use case.</span>
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
            placeholder={gated ? "Connect wallet to use the copilot…" : underfunded ? "Fund your wallet to continue…" : "Ask the copilot…"}
            disabled={blocked}
            className="flex-1 rounded-xl border border-[var(--border-2)] bg-[#0a0d12] px-4 py-3 text-sm outline-none transition focus:border-[rgba(46,230,160,0.6)] disabled:opacity-50"
          />
          <button onClick={() => ask(input)} disabled={blocked} className="btn-brand px-5 py-3 text-sm disabled:opacity-50">
            Send
          </button>
        </div>
        {isConnected && (
          <div className="mt-2 text-[11px] text-[var(--muted)]">
            Paying from <span className="font-mono text-[var(--text)]">{short(address)}</span> — your connected wallet.
          </div>
        )}
      </div>
    </section>
  );
}
