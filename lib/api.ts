/**
 * Client for the IdleFlow backend REST layer (the human front door). Reads are
 * free; the backend only ever returns data or unsigned calldata — the wallet signs.
 * Base URL from NEXT_PUBLIC_IDLEFLOW_API (defaults to the live Fly deployment).
 */
const BASE = process.env.NEXT_PUBLIC_IDLEFLOW_API ?? "https://idleflow-v1.fly.dev";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface YieldVenue {
  venue_id: string;
  venue_name: string;
  asset: string;
  chain: string;
  chain_id: number;
  token_address: string;
  apy_pct: number;
  apy_bps: number;
  tvl: string;
  risk_score: number;
}
export interface YieldResponse {
  asset: string;
  opportunities: YieldVenue[];
}
export interface MarketOverview {
  total_market_cap_usd: number;
  change_pct?: { day?: number; week?: number };
}
export interface PreparedTx {
  kind: string;
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string;
  chainId?: number;
  description?: string;
}
export interface DepositPlan {
  mode: "intent";
  venue_name: string;
  asset: string;
  amount: string;
  chain_id: number;
  transactions: PreparedTx[];
  execute_hint: string;
}

export const api = {
  yield: (asset = "USDT") => get<YieldResponse>(`/api/yield?asset=${encodeURIComponent(asset)}`),
  market: () => get<MarketOverview>("/api/market"),
  positions: (wallet: string) => get<unknown>(`/api/positions?wallet=${wallet}`),
  guardianToken: (address: string) => get<{ risk_level: string }>(`/api/guardian/token?address=${address}`),
  prepareDeposit: (payload: { wallet: string; asset?: string; amount: string; venue_id?: string }) =>
    post<DepositPlan>("/api/prepare/deposit", payload),
  copilot: (message: string, wallet?: string) => post<CopilotResult>("/api/copilot", { message, wallet }),
};

export interface CopilotResult {
  service: string;
  service_id: string;
  tool: string;
  job_id: string;
  pay_tx?: string;
  result: unknown;
  via: string;
}
