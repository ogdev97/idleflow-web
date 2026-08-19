import sandbox from "./sandbox.json";

/** X Layer TESTNET sandbox — faucet token + demo vault. Addresses are filled in
 * by the backend deploy script (`npm run sandbox:deploy`). Until then they're the
 * zero address and the UI shows a "not deployed yet" state. */
export const SANDBOX = sandbox as { chainId: number; tUSDT: `0x${string}`; vault: `0x${string}`; explorer: string; deployedAt: string | null };

export const SANDBOX_READY =
  SANDBOX.tUSDT !== "0x0000000000000000000000000000000000000000" &&
  SANDBOX.vault !== "0x0000000000000000000000000000000000000000";

/** Demo APR the vault pays (must match IdleFlowVault.APR_BPS = 800). */
export const SANDBOX_APR_PCT = 8;
/** Faucet hands out this much tUSDT per call (TestUSDT.FAUCET_AMOUNT). */
export const FAUCET_AMOUNT = 1000;

/** OKX X Layer testnet gas faucet (external — the user needs a little testnet OKB). */
export const OKB_FAUCET_URL = "https://www.okx.com/xlayer/faucet";

export const tUSDT_ABI = [
  { type: "function", name: "faucet", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "lastFaucet", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const vault_ABI = [
  { type: "function", name: "deposit", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "principal", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "earned", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "lastAccrue", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "APR_BPS", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;
