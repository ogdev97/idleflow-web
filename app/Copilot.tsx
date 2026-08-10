"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { api, type CopilotResult } from "@/lib/api";

type Turn = { role: "user"; text: string } | { role: "assistant"; data: CopilotResult } | { role: "error"; text: string };

const USE_CASES: { label: string; prompt: string }[] = [
  { label: "Best USDT yield", prompt: "What's the best USDT yield on X Layer?" },
  { label: "OKB token yield", prompt: "Find the best yield for OKB" },
  { label: "Stablecoin market", prompt: "How's the stablecoin market doing?" },
  { label: "Cross-chain route", prompt: "Quote a cross-chain route from X Layer to Base" },
  { label: "Guardian scan", prompt: "Is token 0x779ded0c9e1022225f8e0630b35a9b54be713736 safe?" },
  { label: "Yield autopilot", prompt: "Set up yield autopilot for my position" },
];

function Deliverable({ d }: { d: CopilotResult }) {
  const r = d.result as Record<string, unknown>;
  const n = (v: unknown) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });

  let body: React.ReactNode;
  if (Array.isArray(r?.opportunities)) {
    body = (
      <div className="flex flex-col gap-1">
        {(r.opportunities as Record<string, unknown>[]).map((o, i) => (
          <div key={i} className="flex justify-between">
            <span>{String(o.venue_name)}</span>
            <span className="text-emerald-400">{String(o.apy_pct)}% · risk {String(o.risk_score)}</span>
          </div>
        ))}
      </div>
    );
  } else if (typeof r?.total_market_cap_usd === "number") {
    const x = r.xlayer as Record<string, unknown> | undefined;
    body = (
      <div>
        Total stablecoin cap ${n(r.total_market_cap_usd)} · X Layer share {String(x?.share_pct ?? "—")}%
      </div>
    );
  } else if (r?.risk_level) {
    body = <div>Risk: <span className="text-emerald-400">{String(r.risk_level)}</span>{r.is_honeypot ? " · ⚠ honeypot" : ""}</div>;
  } else if (Array.isArray(r?.options)) {
    body = (
      <div className="flex flex-col gap-1">
        {(r.options as Record<string, unknown>[]).slice(0, 4).map((o, i) => (
          <div key={i} className="flex justify-between">
            <span>{String(o.name ?? o.protocol ?? "pool")}</span>
            <span className="text-emerald-400">{String(o.apy_pct ?? o.apy ?? "")}%</span>
          </div>
        ))}
      </div>
    );
  } else {
    body = <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-neutral-300">{JSON.stringify(r, null, 2).slice(0, 800)}</pre>;
  }

  return (
    <div className="rounded-2xl bg-neutral-800/70 px-3 py-2.5 text-sm text-neutral-100">
      <div className="mb-1 text-xs text-neutral-500">
        {d.service} · via OKX A2A/x402 ·{" "}
        <span title={d.job_id}>job {d.job_id.slice(0, 8)}…</span>
        {d.pay_tx && <> · paid {d.pay_tx.slice(0, 8)}…</>}
      </div>
      {body}
    </div>
  );
}

export function Copilot() {
  const { address } = useAccount();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: msg }]);
    setBusy(true);
    try {
      const data = await api.copilot(msg, address);
      setTurns((t) => [...t, { role: "assistant", data }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "error", text: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <span className="text-emerald-400">✦</span>
        <span className="font-medium">Copilot</span>
        <span className="text-neutral-500">— runs on the OKX AI agent layer (no LLM key)</span>
      </div>
      <div className="mb-3 text-xs text-neutral-500">
        Each request hires IdleFlow (#4523) on OKX.AI and pays 0.01 USDT — real, on-chain, non-custodial.
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
          <div className="text-sm text-neutral-500">Pick a use case above, or ask anything about X Layer yield.</div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "text-right" : ""}>
            {t.role === "user" && <span className="inline-block rounded-2xl bg-emerald-600/90 px-3 py-2 text-sm text-white">{t.text}</span>}
            {t.role === "assistant" && <Deliverable d={t.data} />}
            {t.role === "error" && <span className="inline-block rounded-2xl bg-red-950/60 px-3 py-2 text-sm text-red-300">{t.text}</span>}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-600 border-t-emerald-500" />
            Hiring IdleFlow on OKX.AI (on-chain, ~45s)…
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(input)}
          placeholder="Ask the copilot…"
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
