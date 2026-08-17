"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useBytecode, useChainId, useReadContract, useSendTransaction, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi, formatUnits } from "viem";
import { api, type AutopilotStatus } from "@/lib/api";
import { STABLES } from "@/lib/x402";
import { wagmiConfig } from "@/lib/wagmi";
import { xLayer } from "@/lib/chains";

type Policy = { asset: "USDT" | "USDG"; min: number; max: number; cooldownHrs: number; enabled: boolean };
const DEFAULT: Policy = { asset: "USDG", min: 10, max: 100, cooldownHrs: 24, enabled: false };

function loadPolicy(wallet?: string): Policy {
  if (typeof window === "undefined" || !wallet) return DEFAULT;
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(`idleflow.autopilot.${wallet.toLowerCase()}`) || "{}") };
  } catch {
    return DEFAULT;
  }
}
function savePolicy(wallet: string, p: Policy) {
  localStorage.setItem(`idleflow.autopilot.${wallet.toLowerCase()}`, JSON.stringify(p));
}

export function AutopilotPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();

  // A wallet WITH bytecode is a smart account (Agentic Wallet) → eligible for true-auto.
  const { data: code } = useBytecode({ address, chainId: xLayer.id, query: { enabled: isConnected && !!address } });
  const isSmartAccount = !!code && code !== "0x";

  const [policy, setPolicy] = useState<Policy>(DEFAULT);
  const [server, setServer] = useState<AutopilotStatus["policies"][number] | null>(null);

  // Hydrate from localStorage instantly, then reconcile with the server (source of
  // truth for the keeper) so an enabled policy set on another device shows here.
  useEffect(() => {
    setPolicy(loadPolicy(address));
    setServer(null);
    if (!address) return;
    let live = true;
    api
      .autopilotStatus(address)
      .then((s) => {
        if (!live) return;
        const p = s.policies.find((x) => x.idle_deposit) ?? s.policies[0] ?? null;
        setServer(p ?? null);
        if (p && p.idle_deposit) {
          const merged: Policy = {
            asset: p.asset,
            min: p.min_trigger ?? DEFAULT.min,
            max: p.max_per_run ?? DEFAULT.max,
            cooldownHrs: p.cooldown_hours ?? DEFAULT.cooldownHrs,
            enabled: p.enabled,
          };
          setPolicy(merged);
          savePolicy(address, merged);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [address]);

  // Persist to the backend (debounced) so the keeper sweeps this policy.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function syncToServer(next: Policy, wallet: string) {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      api
        .setAutopilotPolicy({ wallet, asset: next.asset, min_trigger: next.min, max_per_run: next.max, cooldown_hours: next.cooldownHrs, enabled: next.enabled })
        .then(() => api.autopilotStatus(wallet))
        .then((s) => setServer(s.policies.find((x) => x.idle_deposit) ?? null))
        .catch(() => {});
    }, 500);
  }

  const update = (patch: Partial<Policy>) => {
    const next = { ...policy, ...patch };
    setPolicy(next);
    if (address) {
      savePolicy(address, next);
      syncToServer(next, address);
    }
  };

  const asset = STABLES.find((s) => s.sym === policy.asset)!;
  const { data: raw } = useReadContract({
    address: asset.addr,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: xLayer.id,
    query: { enabled: isConnected && !!address, refetchInterval: 15_000 },
  });
  const idle = raw !== undefined ? Number(formatUnits(raw, 6)) : undefined;
  const wouldDeposit = idle !== undefined && idle >= policy.min ? Math.min(idle, policy.max) : 0;

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function depositNow() {
    if (!address || wouldDeposit <= 0) return;
    setBusy(true);
    setStatus("");
    try {
      if (chainId !== xLayer.id) await switchChainAsync({ chainId: xLayer.id });
      const plan = await api.prepareDeposit({ wallet: address, asset: policy.asset, amount: String(wouldDeposit) });
      for (const t of plan.transactions) {
        setStatus(`${t.kind === "approve" ? "Approving" : "Supplying"} — sign in wallet`);
        const hash = await sendTransactionAsync({ to: t.to, data: t.data, value: t.value ? BigInt(t.value) : BigInt(0) });
        setStatus(`Confirming ${t.kind}…`);
        await waitForTransactionReceipt(wagmiConfig, { hash });
      }
      setStatus(`✓ Deposited ${wouldDeposit} ${policy.asset} to the best venue — earning now.`);
    } catch (e) {
      setStatus(`✕ ${(e instanceof Error ? e.message : String(e)).slice(0, 70)}`);
    } finally {
      setBusy(false);
    }
  }

  const mode = isSmartAccount ? "auto" : "semi";

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">🤖 Yield Autopilot</div>
        {isConnected && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${mode === "auto" ? "bg-[rgba(46,230,160,0.16)] text-[var(--brand)]" : "bg-neutral-700/40 text-neutral-300"}`}>
            {mode === "auto" ? "Agentic · auto" : "EOA · 1-click"}
          </span>
        )}
      </div>

      {/* How it works — clarity for both flows */}
      <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-[11px] leading-relaxed text-[var(--muted)]">
        {mode === "auto" ? (
          <>Your <b className="text-[var(--text)]">Agentic Wallet</b> auto-deposits idle {policy.asset} into the best Aave venue whenever it&apos;s ≥ your minimum — <b className="text-[var(--text)]">hands-off</b>, signed by your wallet&apos;s secure session within the spend limit you set. IdleFlow never holds your key.</>
        ) : (
          <>You&apos;re on an <b className="text-[var(--text)]">EOA wallet</b> → <b className="text-[var(--text)]">one-click</b> mode: IdleFlow watches your idle {policy.asset}; when it crosses your minimum, you approve the deposit in one click. (Fully hands-off auto needs an OKX <b className="text-[var(--text)]">Agentic Wallet</b>.)</>
        )}
      </div>

      {/* Config */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--muted)]">Asset</span>
          <select value={policy.asset} onChange={(e) => update({ asset: e.target.value as "USDT" | "USDG" })} className="rounded-lg border border-[var(--border-2)] bg-[#0a0d12] px-2 py-1.5 text-sm outline-none">
            {STABLES.map((s) => <option key={s.sym} value={s.sym}>{s.sym}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--muted)]">Cooldown (hrs)</span>
          <input type="number" min={1} value={policy.cooldownHrs} onChange={(e) => update({ cooldownHrs: Number(e.target.value) })} className="rounded-lg border border-[var(--border-2)] bg-[#0a0d12] px-2 py-1.5 outline-none focus:border-[rgba(46,230,160,0.6)]" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--muted)]">Min trigger ($)</span>
          <input type="number" min={0} value={policy.min} onChange={(e) => update({ min: Number(e.target.value) })} className="rounded-lg border border-[var(--border-2)] bg-[#0a0d12] px-2 py-1.5 outline-none focus:border-[rgba(46,230,160,0.6)]" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--muted)]">Max / run ($)</span>
          <input type="number" min={0} value={policy.max} onChange={(e) => update({ max: Number(e.target.value) })} className="rounded-lg border border-[var(--border-2)] bg-[#0a0d12] px-2 py-1.5 outline-none focus:border-[rgba(46,230,160,0.6)]" />
        </label>
      </div>

      {/* Status */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--panel)] px-3 py-2 text-xs">
        <span className="text-[var(--muted)]">
          Idle {policy.asset}: <span className="text-[var(--text)]">{idle !== undefined ? idle.toFixed(2) : isConnected ? "…" : "—"}</span>
        </span>
        <span className={wouldDeposit > 0 ? "brand-text" : "text-[var(--muted)]"}>
          {!isConnected ? "connect wallet" : wouldDeposit > 0 ? `would deposit ${wouldDeposit} ${policy.asset}` : `below $${policy.min} min`}
        </span>
      </div>

      {/* Action */}
      {mode === "auto" ? (
        <button
          onClick={() => update({ enabled: !policy.enabled })}
          disabled={!isConnected}
          className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 ${policy.enabled ? "btn-ghost" : "btn-brand"}`}
        >
          {policy.enabled ? "Autopilot ON — tap to pause" : "Enable auto-deposit"}
        </button>
      ) : (
        <button onClick={depositNow} disabled={!isConnected || busy || wouldDeposit <= 0} className="btn-brand mt-3 w-full px-4 py-2.5 text-sm disabled:opacity-40">
          {busy ? "Working…" : wouldDeposit > 0 ? `Deposit ${wouldDeposit} ${policy.asset} now` : "Nothing to deposit yet"}
        </button>
      )}

      {mode === "auto" && policy.enabled && (
        <div className="mt-2 text-[11px] text-[var(--muted)]">
          Runs automatically via your Agentic Wallet session when idle ≥ ${policy.min}, up to ${policy.max}/run, every {policy.cooldownHrs}h. Non-custodial.
        </div>
      )}

      {/* Keeper status — server-side truth (what the L3 sweep will do). */}
      {server?.idle_deposit && (
        <div className="mt-2 rounded-lg bg-[var(--panel)] px-3 py-2 text-[11px] text-[var(--muted)]">
          <span className="text-[var(--brand)]">✓ saved server-side</span>
          {server.best_venue?.venue_name && <> · best: {server.best_venue.venue_name.replace(/ \(X Layer\)/, "")} {server.best_venue.apy_pct != null && `${server.best_venue.apy_pct.toFixed(2)}%`}</>}
          {server.in_cooldown && server.next_eligible_at && <> · cooldown until {new Date(server.next_eligible_at).toLocaleString()}</>}
          {server.would_deposit > 0 && !server.in_cooldown && <> · next run deposits ${server.would_deposit} {server.asset}</>}
          {server.last_reason && <> · last: {server.last_reason.slice(0, 60)}</>}
        </div>
      )}
      {status && <div className="mt-2 text-[11px] text-[var(--muted)]">{status}</div>}
    </div>
  );
}
