"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { xLayer } from "@/lib/chains";

/**
 * On connect, prompt the wallet to switch to X Layer (196) — IdleFlow's chain.
 * Auto-attempts once; if the user declines or the wallet is on another chain,
 * shows a persistent banner with a manual switch button.
 */
export function AutoSwitchChain() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const tried = useRef(false);
  const [err, setErr] = useState<string | null>(null);

  const wrongChain = isConnected && chainId !== xLayer.id;

  useEffect(() => {
    if (!wrongChain) {
      tried.current = false; // back on X Layer → allow re-prompt next time
      setErr(null);
      return;
    }
    if (tried.current) return;
    tried.current = true;
    switchChainAsync({ chainId: xLayer.id }).catch((e) => setErr(e instanceof Error ? e.message.slice(0, 90) : "switch rejected"));
  }, [wrongChain, switchChainAsync]);

  if (!wrongChain) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
      <span>⚠ Your wallet is on the wrong network. IdleFlow runs on <b>X Layer</b>.</span>
      <button
        onClick={() => {
          setErr(null);
          switchChainAsync({ chainId: xLayer.id }).catch((e) => setErr(e instanceof Error ? e.message.slice(0, 90) : "switch rejected"));
        }}
        disabled={isPending}
        className="btn-brand ml-auto px-3 py-1.5 text-xs disabled:opacity-50"
      >
        {isPending ? "Switching…" : "Switch to X Layer"}
      </button>
      {err && <span className="w-full text-[11px] text-amber-300/80">{err}</span>}
    </div>
  );
}
