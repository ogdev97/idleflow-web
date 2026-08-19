"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useChainId, useReadContract, useSendTransaction, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import { wagmiConfig } from "@/lib/wagmi";
import { xLayerTestnet } from "@/lib/chains";
import { SANDBOX, SANDBOX_READY, SANDBOX_APR_PCT, FAUCET_AMOUNT, OKB_FAUCET_URL, tUSDT_ABI, vault_ABI } from "@/lib/sandbox";
import { ConnectWallet } from "./ConnectWallet";

const YEAR = 365 * 24 * 3600;

function StepDot({ state }: { state: "done" | "active" | "todo" }) {
  return (
    <span
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
        state === "done" ? "bg-[var(--brand)] text-[var(--brand-ink)]" : state === "active" ? "border-2 border-[var(--brand)] text-[var(--brand)]" : "border border-[var(--border-2)] text-[var(--muted)]"
      }`}
    >
      {state === "done" ? "✓" : "•"}
    </span>
  );
}

export function Sandbox() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();

  const onTestnet = chainId === xLayerTestnet.id;
  const [busy, setBusy] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [lastTx, setLastTx] = useState<`0x${string}` | null>(null);
  const [amount, setAmount] = useState("100");

  // Live reads (poll while connected on testnet).
  const q = { enabled: isConnected && !!address && onTestnet && SANDBOX_READY, refetchInterval: 5000 } as const;
  const gasBal = useBalance({ address, chainId: xLayerTestnet.id, query: { enabled: isConnected && !!address, refetchInterval: 8000 } });
  const tusdt = useReadContract({ address: SANDBOX.tUSDT, abi: tUSDT_ABI, functionName: "balanceOf", args: address ? [address] : undefined, chainId: xLayerTestnet.id, query: q });
  const principal = useReadContract({ address: SANDBOX.vault, abi: vault_ABI, functionName: "principal", args: address ? [address] : undefined, chainId: xLayerTestnet.id, query: q });
  const lastAccrue = useReadContract({ address: SANDBOX.vault, abi: vault_ABI, functionName: "lastAccrue", args: address ? [address] : undefined, chainId: xLayerTestnet.id, query: q });

  const gas = gasBal.data ? Number(formatUnits(gasBal.data.value, 18)) : 0;
  const hasGas = gas > 0;
  const walletUsdt = tusdt.data !== undefined ? Number(formatUnits(tusdt.data as bigint, 6)) : 0;
  const principalNum = principal.data !== undefined ? Number(formatUnits(principal.data as bigint, 6)) : 0;
  const hasPosition = principalNum > 0;

  // Client-side live-ticking position = principal + demo interest since lastAccrue.
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 250);
    return () => clearInterval(t);
  }, []);
  const liveBalance = useMemo(() => {
    if (!hasPosition || lastAccrue.data === undefined) return principalNum;
    const elapsed = Math.max(0, now - Number(lastAccrue.data as bigint));
    return principalNum + (principalNum * (SANDBOX_APR_PCT / 100) * elapsed) / YEAR;
  }, [hasPosition, principalNum, lastAccrue.data, now]);
  const earnedLive = liveBalance - principalNum;

  async function run(label: string, to: `0x${string}`, data: `0x${string}`) {
    setBusy(label);
    setMsg("");
    setLastTx(null);
    try {
      if (!onTestnet) await switchChainAsync({ chainId: xLayerTestnet.id });
      const hash = await sendTransactionAsync({ to, data, value: BigInt(0) });
      setLastTx(hash);
      setMsg(`${label} — confirming…`);
      await waitForTransactionReceipt(wagmiConfig, { hash });
      setMsg(`✓ ${label} confirmed.`);
      gasBal.refetch(); tusdt.refetch(); principal.refetch(); lastAccrue.refetch();
    } catch (e) {
      setMsg(`✕ ${(e instanceof Error ? e.message : String(e)).slice(0, 90)}`);
    } finally {
      setBusy("");
    }
  }

  const getTusdt = () => run("Get 1,000 tUSDT", SANDBOX.tUSDT, encodeFunctionData({ abi: tUSDT_ABI, functionName: "faucet" }));

  async function deposit() {
    if (!address) return;
    const amt = parseUnits(amount || "0", 6);
    if (amt <= BigInt(0)) return;
    setBusy("Deposit");
    setMsg("");
    try {
      if (!onTestnet) await switchChainAsync({ chainId: xLayerTestnet.id });
      // approve
      setMsg("Approve tUSDT — sign in wallet");
      const a = await sendTransactionAsync({ to: SANDBOX.tUSDT, data: encodeFunctionData({ abi: tUSDT_ABI, functionName: "approve", args: [SANDBOX.vault, amt] }), value: BigInt(0) });
      await waitForTransactionReceipt(wagmiConfig, { hash: a });
      // deposit
      setMsg("Deposit to vault — sign in wallet");
      const d = await sendTransactionAsync({ to: SANDBOX.vault, data: encodeFunctionData({ abi: vault_ABI, functionName: "deposit", args: [amt] }), value: BigInt(0) });
      setLastTx(d);
      setMsg("Depositing…");
      await waitForTransactionReceipt(wagmiConfig, { hash: d });
      setMsg(`✓ Deposited ${amount} tUSDT — now earning ${SANDBOX_APR_PCT}% demo APR.`);
      tusdt.refetch(); principal.refetch(); lastAccrue.refetch();
    } catch (e) {
      setMsg(`✕ ${(e instanceof Error ? e.message : String(e)).slice(0, 90)}`);
    } finally {
      setBusy("");
    }
  }

  const withdraw = () => run("Withdraw all", SANDBOX.vault, encodeFunctionData({ abi: vault_ABI, functionName: "withdraw" }));

  // Step states
  const s1 = isConnected ? "done" : "active";
  const s2 = !isConnected ? "todo" : onTestnet ? "done" : "active";
  const s3 = !onTestnet ? "todo" : hasGas ? "done" : "active";
  const s4 = !hasGas ? "todo" : walletUsdt > 0 || hasPosition ? "done" : "active";
  const s5 = walletUsdt <= 0 && !hasPosition ? "todo" : hasPosition ? "done" : "active";

  if (!SANDBOX_READY) {
    return (
      <div className="glass p-5">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">🧪 Testnet sandbox</div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Sandbox contracts not deployed yet. Run <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--text)]">npm run sandbox:deploy</code> in the backend (with a funded testnet deployer key) to publish tUSDT + the vault, then this flow goes live.
        </p>
      </div>
    );
  }

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">🧪 Try it on testnet — free, no real money</div>
        <span className="rounded-full bg-[rgba(46,230,160,0.14)] px-2 py-0.5 text-[10px] text-[var(--brand)]">X Layer Testnet · {SANDBOX_APR_PCT}% demo APR</span>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Practice the full non-custodial earn flow with free test tokens — you sign every step, you keep custody. Same flow as mainnet, zero risk.
      </p>

      {/* LIVE position — the payoff, shown up top once earning. */}
      {hasPosition && (
        <div className="mt-4 rounded-xl border border-[rgba(46,230,160,0.35)] bg-[rgba(46,230,160,0.06)] p-4">
          <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Your position — earning live</div>
          <div className="mt-1 font-mono text-3xl font-semibold brand-text tabular-nums">{liveBalance.toFixed(6)} <span className="text-lg">tUSDT</span></div>
          <div className="mt-0.5 text-[12px] text-[var(--muted)]">
            principal {principalNum.toFixed(2)} · <span className="brand-text">+{earnedLive.toFixed(6)} earned</span> · {SANDBOX_APR_PCT}% APR (demo)
          </div>
          <button onClick={withdraw} disabled={!!busy} className="btn-ghost mt-3 w-full px-3 py-2 text-sm disabled:opacity-40">
            {busy === "Withdraw all" ? "Withdrawing…" : "Withdraw principal + yield"}
          </button>
        </div>
      )}

      {/* STEPPER */}
      <ol className="mt-4 flex flex-col gap-3">
        {/* 1 connect */}
        <li className="flex items-start gap-3">
          <StepDot state={s1 as never} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Connect your wallet</div>
            {!isConnected && <div className="mt-2"><ConnectWallet /></div>}
          </div>
        </li>
        {/* 2 network */}
        <li className="flex items-start gap-3">
          <StepDot state={s2 as never} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Switch to X Layer Testnet</div>
            {isConnected && !onTestnet && (
              <button onClick={() => switchChainAsync({ chainId: xLayerTestnet.id }).catch(() => {})} className="btn-brand mt-2 px-3 py-1.5 text-sm">
                Switch network
              </button>
            )}
            {onTestnet && <div className="text-[12px] text-[var(--muted)]">Connected to X Layer Testnet (1952).</div>}
          </div>
        </li>
        {/* 3 gas */}
        <li className="flex items-start gap-3">
          <StepDot state={s3 as never} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Get a little test OKB for gas {onTestnet && <span className="text-[var(--muted)]">· balance {gas.toFixed(4)} OKB</span>}</div>
            {onTestnet && !hasGas && (
              <div className="mt-2 flex items-center gap-2">
                <a href={OKB_FAUCET_URL} target="_blank" rel="noopener" className="btn-brand px-3 py-1.5 text-sm">Open OKX testnet faucet ↗</a>
                <button onClick={() => gasBal.refetch()} className="btn-ghost px-3 py-1.5 text-sm">I&apos;ve got gas — refresh</button>
              </div>
            )}
          </div>
        </li>
        {/* 4 faucet tUSDT */}
        <li className="flex items-start gap-3">
          <StepDot state={s4 as never} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Get free tUSDT {(walletUsdt > 0 || hasPosition) && <span className="text-[var(--muted)]">· wallet {walletUsdt.toFixed(2)} tUSDT</span>}</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]">One tap mints {FAUCET_AMOUNT.toLocaleString()} tUSDT to your wallet.</div>
            <button onClick={getTusdt} disabled={!hasGas || !!busy} className="btn-brand mt-2 px-3 py-1.5 text-sm disabled:opacity-40">
              {busy === "Get 1,000 tUSDT" ? "Minting…" : `Get ${FAUCET_AMOUNT.toLocaleString()} free tUSDT`}
            </button>
          </div>
        </li>
        {/* 5 deposit */}
        <li className="flex items-start gap-3">
          <StepDot state={s5 as never} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Deposit into the IdleFlow vault</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]">Approve + supply in one flow. Starts earning {SANDBOX_APR_PCT}% demo APR immediately.</div>
            <div className="mt-2 flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="w-28 rounded-lg border border-[var(--border-2)] bg-[#0a0d12] px-3 py-1.5 text-sm outline-none focus:border-[rgba(46,230,160,0.6)]"
              />
              <button onClick={() => setAmount(String(Math.floor(walletUsdt)))} disabled={walletUsdt <= 0} className="btn-ghost px-2 py-1.5 text-xs disabled:opacity-40">Max</button>
              <button onClick={deposit} disabled={walletUsdt <= 0 || !!busy || Number(amount) <= 0} className="btn-brand flex-1 px-3 py-1.5 text-sm disabled:opacity-40">
                {busy === "Deposit" ? "Working…" : `Deposit ${amount || "0"} tUSDT`}
              </button>
            </div>
          </div>
        </li>
      </ol>

      {msg && (
        <div className="mt-3 text-[12px] text-[var(--muted)]">
          {msg}
          {lastTx && (
            <> · <a href={`${SANDBOX.explorer}/tx/${lastTx}`} target="_blank" rel="noopener" className="brand-text underline underline-offset-2">view tx ↗</a></>
          )}
        </div>
      )}
    </div>
  );
}
