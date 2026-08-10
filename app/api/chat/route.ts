import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

/**
 * IdleFlow AI Copilot — the required AI element. A "money copilot" for X Layer:
 * finds the best yield, vets tokens with Guardian, checks positions, and prepares a
 * deposit the user signs with their OWN wallet (non-custodial — the copilot never
 * signs and never sees a key). Tools call the same backend REST the marketplace
 * agents use, so there is one source of truth. See docs/WEB_PLATFORM.md.
 *
 * Needs ANTHROPIC_API_KEY (server env, e.g. Vercel project settings).
 */
const BASE = process.env.IDLEFLOW_API ?? process.env.NEXT_PUBLIC_IDLEFLOW_API ?? "https://idleflow-v1.fly.dev";
const MODEL = process.env.IDLEFLOW_COPILOT_MODEL ?? "claude-haiku-4-5";

export const maxDuration = 30;

async function bget(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
  return r.json();
}
async function bpost(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

const SYSTEM = `You are IdleFlow's Copilot — a money copilot for X Layer (chainId 196).
You help people earn on idle stablecoins, safely.

Rules:
- IdleFlow is NON-CUSTODIAL. You never hold funds or sign anything. Deposits are prepared as
  unsigned transactions the user signs with their OWN wallet.
- ALWAYS ground numbers (APY, risk, TVL) in the get_yield / check_token tools. NEVER invent an
  APY, address, or risk score. If a tool fails, say so plainly.
- Before recommending a deposit, you may run check_token on the venue asset. Refuse to help
  deposit into anything Guardian flags HIGH risk or honeypot.
- When the user wants to deposit, call prepare_deposit with their amount. It returns the exact
  transactions; tell them to review and sign in their wallet. Do not claim it's done — they sign.
- If a tool says the wallet isn't connected, ask them to connect their wallet (top right).
- Be concise, concrete, and honest about risk. Stablecoin Aave yields on X Layer are modest.`;

export async function POST(req: Request) {
  const { messages, wallet } = (await req.json()) as { messages: UIMessage[]; wallet?: string };

  const result = streamText({
    model: anthropic(MODEL),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(6),
    tools: {
      get_yield: tool({
        description: "Get the best ranked stablecoin yield venues on X Layer (APY, TVL, risk) for an asset.",
        inputSchema: z.object({ asset: z.enum(["USDT", "USDG"]).default("USDT") }),
        execute: async ({ asset }) => bget(`/api/yield?asset=${asset}`),
      }),
      check_token: tool({
        description: "Guardian safety scan for an X Layer token address (honeypot, tax, mint/freeze, risk level).",
        inputSchema: z.object({ address: z.string().describe("0x… token address") }),
        execute: async ({ address }) => bget(`/api/guardian/token?address=${encodeURIComponent(address)}`),
      }),
      get_positions: tool({
        description: "Get the connected wallet's current IdleFlow positions and accrued yield.",
        inputSchema: z.object({}),
        execute: async () =>
          wallet ? bget(`/api/positions?wallet=${wallet}`) : { error: "WALLET_NOT_CONNECTED", message: "Ask the user to connect their wallet." },
      }),
      prepare_deposit: tool({
        description:
          "Prepare a non-custodial deposit (approve + supply) into the best X Layer venue for the connected wallet. Returns UNSIGNED transactions the user signs. Use when the user wants to deposit/earn.",
        inputSchema: z.object({
          amount: z.string().describe("Human amount, e.g. '100'"),
          asset: z.enum(["USDT", "USDG"]).default("USDT"),
        }),
        execute: async ({ amount, asset }) =>
          wallet
            ? bpost("/api/prepare/deposit", { wallet, amount, asset })
            : { error: "WALLET_NOT_CONNECTED", message: "Ask the user to connect their wallet first." },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
