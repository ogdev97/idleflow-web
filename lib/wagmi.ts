import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { xLayer, xLayerTestnet } from "./chains";

/**
 * wagmi config for IdleFlow web. OKX Wallet (and other browser wallets) inject an
 * EIP-1193 provider, so the `injected` connector covers them. Mainnet default;
 * testnet available for the hackathon judges. Non-custodial: the user's own wallet
 * signs every transaction; the app never holds a key.
 */
export const wagmiConfig = createConfig({
  chains: [xLayer, xLayerTestnet],
  connectors: [injected()],
  transports: {
    [xLayer.id]: http(),
    [xLayerTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
