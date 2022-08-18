import {
  WagmiConfig,
  defaultChains,
  configureChains,
  createClient
} from "wagmi";
import { publicProvider } from "wagmi/providers/public";

const chains = defaultChains.map(chain => {
  const { default: defaultUrl, infura: infuraUrl } = chain.rpcUrls;
  if (typeof infuraUrl === "string" && defaultUrl !== infuraUrl) {
    return {
      ...chain,
      rpcUrls: {
        ...chain.rpcUrls,
        default: infuraUrl
      }
    };
  } else {
    return chain;
  }
});

const { provider, webSocketProvider } = configureChains(chains, [
  publicProvider()
]);

const client = createClient({
  autoConnect: true,
  provider,
  webSocketProvider
});

type WagmiWrapperProps = {
  children: React.ReactNode;
};

function WagmiWrapper({ children }: WagmiWrapperProps): JSX.Element {
  return <WagmiConfig client={client}>{children}</WagmiConfig>;
}

export default WagmiWrapper;
