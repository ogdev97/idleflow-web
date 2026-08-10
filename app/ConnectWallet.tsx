"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";
import { OKX_INSTALL_URL } from "@/lib/wagmi";

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [okxInstalled, setOkxInstalled] = useState(true);

  useEffect(() => {
    setOkxInstalled(typeof window !== "undefined" && !!(window as unknown as { okxwallet?: unknown }).okxwallet);
  }, []);

  if (isConnected) {
    return (
      <button onClick={() => disconnect()} className="btn-ghost px-3 py-2 text-sm">
        <span className="brand-text">●</span> {short(address)}
      </button>
    );
  }

  const okx = connectors.find((c) => c.id === "okxWallet");
  // Other detected wallets: dedupe OKX (both the explicit target and any EIP-6963
  // OKX announcement) and the bare generic injected fallback.
  const seen = new Set<string>();
  const others = connectors.filter((c) => {
    if (c.id === "okxWallet") return false;
    const name = (c.name || "").toLowerCase();
    if (name.includes("okx")) return false;
    if (c.id === "injected" && !c.name) return false;
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });

  const connectOkx = () => {
    if (!okxInstalled) {
      window.open(OKX_INSTALL_URL, "_blank", "noopener");
      return;
    }
    if (okx) connect({ connector: okx });
    setOpen(false);
  };

  const connectOther = (c: Connector) => {
    connect({ connector: c });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} disabled={isPending} className="btn-brand px-4 py-2 text-sm disabled:opacity-50">
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-[var(--border-2)] bg-[#0c1016] p-2 shadow-2xl">
            <button
              onClick={connectOkx}
              className="flex w-full items-center justify-between rounded-lg bg-neutral-800/70 px-3 py-2.5 text-left text-sm font-medium hover:bg-neutral-800"
            >
              <span className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded bg-black text-xs font-bold text-white">OKX</span>
                OKX Wallet
              </span>
              <span className="text-xs text-emerald-400">{okxInstalled ? "recommended" : "install"}</span>
            </button>

            {others.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-neutral-500">Other wallets</div>
                {others.map((c) => (
                  <button
                    key={c.uid}
                    onClick={() => connectOther(c)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    {c.icon && <img src={c.icon} alt="" className="h-5 w-5 rounded" />}
                    {c.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
