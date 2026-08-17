import { x402Client, x402HTTPClient } from "@okxweb3/x402-core/client";
import { ExactEvmScheme } from "@okxweb3/x402-evm";
import { createPublicClient, http, type WalletClient } from "viem";
import { xLayer } from "./chains";

// Read-only client so the exact scheme can read the token's on-chain EIP-712
// domain/nonce when building the EIP-3009 authorization.
const publicClient = createPublicClient({ chain: xLayer, transport: http() });

/**
 * Client-side x402 — the USER's own wallet pays for each service call. The browser
 * gets the 402 challenge from IdleFlow's /mcp, the user's wallet signs the EIP-3009
 * transferWithAuthorization (0.01 USDT → IdleFlow), and the request is replayed with
 * the payment header. IdleFlow never holds funds and never pays on the user's behalf.
 */
const RESOURCE = `${process.env.NEXT_PUBLIC_IDLEFLOW_API ?? "https://idleflow-v1.fly.dev"}/mcp`;
const NETWORK = "eip155:196"; // X Layer mainnet

/** USD₮0 on X Layer (the x402 payment asset) + the per-call price. */
export const USDT_ADDRESS = "0x779ded0c9e1022225f8e0630b35a9b54be713736" as const;
export const CALL_PRICE_USDT = 0.01;

function toolBody(tool: string, args: Record<string, unknown>) {
  return JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } });
}

/** Unwrap an MCP tool result (content[0].text is a JSON string). */
function unwrap(json: unknown): unknown {
  const text = (json as { result?: { content?: Array<{ text?: string }> } })?.result?.content?.[0]?.text;
  if (typeof text === "string") {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return (json as { result?: unknown })?.result ?? json;
}

export interface PaidCall {
  result: unknown;
  paid: boolean;
}

/**
 * Call an IdleFlow tool, paying with the connected wallet if the endpoint demands it.
 * @throws if the user rejects the signature or the wallet lacks USDT.
 */
export async function payAndCallTool(walletClient: WalletClient, tool: string, args: Record<string, unknown>): Promise<PaidCall> {
  const account = walletClient.account;
  if (!account) throw new Error("Wallet not connected");

  const body = toolBody(tool, args);

  // 1. Unpaid request → 402 challenge (or 200 for a free tool).
  const first = await fetch(RESOURCE, { method: "POST", headers: { "content-type": "application/json" }, body });
  if (first.status !== 402) return { result: unwrap(await first.json().catch(() => ({}))), paid: false };

  // 2. Sign the x402 payment with the USER's wallet.
  const signer = {
    address: account.address,
    signTypedData: (m: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) =>
      (walletClient.signTypedData as (a: unknown) => Promise<`0x${string}`>)({
        account,
        domain: m.domain,
        types: m.types,
        primaryType: m.primaryType,
        message: m.message,
      }),
    // Required by ExactEvmScheme to read the token's EIP-712 domain/nonce.
    readContract: (a: unknown) => (publicClient.readContract as (x: unknown) => Promise<unknown>)(a),
  };
  const client = new x402Client().register(NETWORK as never, new ExactEvmScheme(signer) as never);
  const http = new x402HTTPClient(client);
  const paymentRequired = http.getPaymentRequiredResponse((n) => first.headers.get(n));
  // Use the low-level build (createPaymentPayload + encode) — handlePaymentRequired
  // returns null via an internal payment-policy selector we don't configure.
  const payload = await http.createPaymentPayload(paymentRequired);
  const payHeaders = http.encodePaymentSignatureHeader(payload);
  if (!payHeaders) throw new Error("Could not build the x402 payment");

  // 3. Replay with the payment header → deliverable.
  const paid = await fetch(RESOURCE, { method: "POST", headers: { "content-type": "application/json", ...payHeaders }, body });
  if (!paid.ok) throw new Error(`Payment replay failed (HTTP ${paid.status})`);
  return { result: unwrap(await paid.json()), paid: true };
}

/** Deterministic intent router over IdleFlow's 6 services (no LLM). */
export function routeIntent(message: string): { service: string; tool: string; args: Record<string, unknown> } {
  const m = message.toLowerCase();
  // Only scope to a specific stable when the user names it; otherwise rank across ALL.
  const asset = /\busdg\b/.test(m) ? "USDG" : /\busdt\b/.test(m) ? "USDT" : undefined;
  const token = (m.match(/\b(okb|xbtc|xeth|weth|wbtc)\b/i)?.[1] ?? "OKB").toUpperCase();
  const address = m.match(/0x[0-9a-f]{40}/i)?.[0];

  if (/(scam|honeypot|safe|rug|guardian|approval|malicious|check (this )?token)/.test(m))
    return { service: "Guardian Safety Scans", tool: "check_token", args: address ? { token_address: address } : {} };
  if (/(bridge|cross[- ]?chain|to base|to ethereum|route)/.test(m))
    return { service: "Cross-chain Route Quote", tool: "get_crosschain_route", args: {} };
  if (/(autopilot|rebalance|monitor|policy)/.test(m))
    return { service: "Yield Autopilot", tool: "autopilot_check", args: {} };
  if (/(market|overview|cap|trend|snapshot)/.test(m))
    return { service: "Stablecoin Market Overview", tool: "get_stablecoin_market_overview", args: {} };
  if (/\b(okb|xbtc|xeth|token yield|any token)\b/.test(m))
    return { service: "Token Yield Finder", tool: "get_token_yield", args: { token } };
  return { service: "Best Stablecoin Yield", tool: "get_yield_opportunities", args: asset ? { asset } : {} };
}
