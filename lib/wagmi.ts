import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { xLayer, xLayerTestnet } from "./chains";

/**
 * wagmi config for IdleFlow web. Non-custodial — the user's own wallet signs every
 * transaction; the app never holds a key.
 *
 * OKX Wallet is the PREDEFINED primary connector: an explicit injected target that
 * returns `window.okxwallet`. Plain `injected()` grabs `window.ethereum` (often
 * MetaMask) even when the user wants OKX — see wevm/references#419 — so we target
 * the OKX provider directly. EIP-6963 discovery stays on (default) so any other
 * installed wallet still shows up as a secondary option.
 */
export const okxConnector = injected({
  target() {
    return {
      id: "okxWallet",
      name: "OKX Wallet",
      provider: (window) => (window as unknown as { okxwallet?: unknown })?.okxwallet as never,
    };
  },
});

export const wagmiConfig = createConfig({
  chains: [xLayer, xLayerTestnet],
  connectors: [okxConnector, injected()],
  multiInjectedProviderDiscovery: true,
  transports: {
    [xLayer.id]: http(),
    [xLayerTestnet.id]: http(),
  },
  ssr: true,
});

/** Deep link to install OKX Wallet when it isn't detected. */
export const OKX_INSTALL_URL = "https://www.okx.com/download";

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
