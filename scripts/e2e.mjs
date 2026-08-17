// End-to-end x402 test with a REAL wallet. Reads E2E_PRIVATE_KEY from .env / env —
// the key never leaves this machine and is never logged. Runs the exact client-side
// flow the web copilot uses: POST /mcp → 402 → sign EIP-3009 with your key → replay
// → deliverable. Each paid tool costs 0.01 USDT (USD₮0) on X Layer, paid by YOU.
//
//   1) put  E2E_PRIVATE_KEY=0x...  in idleflow-web/.env  (gitignored)
//   2) node scripts/e2e.mjs
//
import { readFileSync } from "node:fs";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http as viemHttp, erc20Abi, formatUnits, defineChain } from "viem";
import { x402Client, x402HTTPClient } from "@okxweb3/x402-core/client";
import { ExactEvmScheme } from "@okxweb3/x402-evm";

const RESOURCE = process.env.E2E_RESOURCE ?? "https://idleflow-v1.fly.dev/mcp";
const NETWORK = "eip155:196";
const USDT = "0x779ded0c9e1022225f8e0630b35a9b54be713736";

// --- read the key from env or .env (never printed) ---
function loadKey() {
  if (process.env.E2E_PRIVATE_KEY) return process.env.E2E_PRIVATE_KEY.trim();
  for (const f of [".env", ".env.local"]) {
    try {
      const m = readFileSync(new URL(`../${f}`, import.meta.url), "utf8").match(/^\s*E2E_PRIVATE_KEY\s*=\s*("?)(0x[0-9a-fA-F]{64})\1/m);
      if (m) return m[2];
    } catch {}
  }
  return null;
}

const key = loadKey();
if (!key) {
  console.error("✗ No E2E_PRIVATE_KEY found. Add `E2E_PRIVATE_KEY=0x...` to idleflow-web/.env, then re-run.");
  process.exit(1);
}
const account = privateKeyToAccount(key);

const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
});
const pub = createPublicClient({ chain: xLayer, transport: viemHttp() });

async function callTool(tool, args) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } });
  const first = await fetch(RESOURCE, { method: "POST", headers: { "content-type": "application/json" }, body });
  if (first.status !== 402) {
    return { paid: false, status: first.status, json: await first.json().catch(() => ({})) };
  }
  const signer = {
    address: account.address,
    signTypedData: (m) => account.signTypedData({ domain: m.domain, types: m.types, primaryType: m.primaryType, message: m.message }),
    readContract: (a) => pub.readContract(a),
  };
  const client = new x402Client().register(NETWORK, new ExactEvmScheme(signer));
  const httpc = new x402HTTPClient(client);
  const pr = httpc.getPaymentRequiredResponse((n) => first.headers.get(n));
  const payload = await httpc.createPaymentPayload(pr);
  const headers = httpc.encodePaymentSignatureHeader(payload);
  const paid = await fetch(RESOURCE, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  return { paid: true, status: paid.status, json: await paid.json().catch(() => ({})) };
}

function unwrap(json) {
  const t = json?.result?.content?.[0]?.text;
  if (typeof t === "string") { try { return JSON.parse(t); } catch { return t; } }
  return json?.result ?? json;
}

const TESTS = [
  ["get_stablecoin_market_overview", {}],
  ["get_yield_opportunities", {}],
  ["get_token_yield", { token: "OKB" }],
  ["check_token", { token_address: USDT }],
];

async function main() {
  console.log(`\n▶ E2E x402 — payer ${account.address}`);
  const bal = await pub.readContract({ address: USDT, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  const usdt = Number(formatUnits(bal, 6));
  console.log(`  USDT (USD₮0) balance: ${usdt.toFixed(4)}   (need ≥ ${(TESTS.length * 0.01).toFixed(2)} for all tests)\n`);
  if (usdt < 0.01) {
    console.error("✗ Insufficient USDT on X Layer — send some USD₮0 to the address above, then re-run.");
    process.exit(1);
  }

  let ok = 0;
  for (const [tool, args] of TESTS) {
    process.stdout.write(`  ${tool} … `);
    try {
      const r = await callTool(tool, args);
      const out = unwrap(r.json);
      const summary =
        out?.total_market_cap_usd ? `cap $${(out.total_market_cap_usd / 1e9).toFixed(0)}B` :
        Array.isArray(out?.opportunities) ? `${out.opportunities[0]?.venue_name} ${out.opportunities[0]?.apy_pct}%` :
        Array.isArray(out?.options) ? `top ${out.options[0]?.name} ${out.options[0]?.apy_pct}%` :
        out?.risk_level ? `risk ${out.risk_level}` : "ok";
      console.log(`HTTP ${r.status} ${r.paid ? "(paid 0.01)" : "(free)"} — ${summary}`);
      if (r.status === 200) ok++;
    } catch (e) {
      console.log(`✗ ${e instanceof Error ? e.message.slice(0, 120) : e}`);
    }
  }
  console.log(`\n${ok === TESTS.length ? "✅" : "⚠"} ${ok}/${TESTS.length} paid calls returned 200.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
