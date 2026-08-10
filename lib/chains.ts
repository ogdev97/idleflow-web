import { defineChain } from "viem";

/** X Layer mainnet — chainId 196, gas token OKB. */
export const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
  blockExplorers: { default: { name: "OKLink", url: "https://www.oklink.com/xlayer" } },
});

/** X Layer testnet — chainId 1952 (verified via xlayertestrpc.okx.com; 195 is deprecated). */
export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  testnet: true,
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://xlayertestrpc.okx.com"] } },
  blockExplorers: { default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" } },
});
