"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { SANDBOX_APR_PCT } from "@/lib/sandbox";

/**
 * A compact AI copilot for the sandbox — the same intent-routed assistant AI
 * agents pay for on the OKX marketplace, here answering with FREE live reads
 * (real X Layer yield / market / token safety). No wallet payment; works while
 * the user is on testnet. Deterministic router (no LLM key), fail-soft.
 */
const SUGGESTIONS = ["Best real yield on X Layer?", "Is this sandbox safe?", "How does the yield work?"];

async function answer(qRaw: string): Promise<string> {
  const q = qRaw.toLowerCase();
  const addr = q.match(/0x[0-9a-f]{40}/i)?.[0];

  if (addr || /\b(safe|scam|honeypot|rug|guardian|malicious)\b/.test(q)) {
    if (addr) {
      try {
        const r = await api.guardianToken(addr);
        return `Guardian: token ${addr.slice(0, 8)}… risk level ${r.risk_level ?? "unknown"}. Always scan before you deposit real funds.`;
      } catch {
        return "Couldn't reach Guardian just now. On mainnet, IdleFlow scans any token for honeypots/scams before you deposit.";
      }
    }
    return "This sandbox is testnet play-money — zero financial risk, and you sign every step (non-custodial). On mainnet, IdleFlow runs an OKX Guardian scan on any token before you deposit.";
  }

  if (/\b(best|yield|apy|earn|real|rate|aave)\b/.test(q)) {
    try {
      const y = await api.yield();
      const t = y.opportunities?.[0];
      if (t) return `Best real X Layer yield right now: ${t.venue_name} — ${t.apy_pct}% APY on ${t.asset}, risk ${t.risk_score}/5. Non-custodial via Aave V3. (This sandbox pays a flat ${SANDBOX_APR_PCT}% demo APR so you can watch it grow.)`;
    } catch { /* fall through */ }
    return `The mainnet app finds the best risk-adjusted Aave V3 yield for your idle USDT/USDG on X Layer. This sandbox pays a flat ${SANDBOX_APR_PCT}% demo APR.`;
  }

  if (/\b(market|cap|stablecoin|trend|overview)\b/.test(q)) {
    try {
      const m = await api.market();
      const cap = m.total_market_cap_usd;
      const s = cap >= 1e9 ? `$${(cap / 1e9).toFixed(1)}B` : `$${(cap / 1e6).toFixed(0)}M`;
      return `Total stablecoin market cap ≈ ${s}${m.change_pct?.week != null ? ` (${m.change_pct.week > 0 ? "+" : ""}${m.change_pct.week.toFixed(1)}% this week)` : ""}. IdleFlow tracks this live on mainnet.`;
    } catch { /* fall through */ }
    return "IdleFlow pulls a live stablecoin market snapshot on mainnet (total cap, X Layer share, yields).";
  }

  if (/\b(how|work|sandbox|demo|apr|vault|deposit)\b/.test(q)) {
    return `You mint free tUSDT, deposit it into the IdleFlow vault, and it earns ${SANDBOX_APR_PCT}% demo APR — the balance ticks up live. You sign every tx and can withdraw principal + yield anytime. Same non-custodial flow as real Aave on mainnet.`;
  }

  return `I can help with yield, token safety, and the market. Try: "${SUGGESTIONS[0]}"`;
}

export function SandboxCopilot() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string>("");

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setReply("");
    try {
      setReply(await answer(question));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass p-5 text-sm">
      <div className="flex items-center gap-2">
        <span className="brand-text">✦</span>
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">IdleFlow AI</div>
      </div>
      <p className="mt-1 text-[12px] text-[var(--muted)]">The same copilot AI agents pay for on OKX — ask about yield, safety, or the market.</p>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about yield or safety…"
          className="min-w-0 flex-1 rounded-lg border border-[var(--border-2)] bg-[#0a0d12] px-3 py-1.5 text-sm outline-none focus:border-[rgba(46,230,160,0.6)]"
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-brand px-3 py-1.5 text-sm disabled:opacity-40">
          {busy ? "…" : "Ask"}
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => { setInput(s); ask(s); }} disabled={busy} className="rounded-full border border-[var(--border-2)] px-2.5 py-1 text-[11px] text-[var(--muted)] transition hover:text-[var(--text)] disabled:opacity-40">
            {s}
          </button>
        ))}
      </div>

      {(reply || busy) && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-[13px] leading-relaxed">
          {busy ? <span className="text-[var(--muted)]">thinking…</span> : reply}
        </div>
      )}
    </div>
  );
}
