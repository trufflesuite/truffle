import { WagmiConfig, createClient } from "wagmi";
import { providers } from "ethers";

const client = createClient({
  autoConnect: true,
  // @ts-ignore
  provider: new providers.Web3Provider(window.ethereum || "ws://localhost:8545")
});

type WagmiWrapperProps = {
  children: React.ReactNode;
};

function WagmiWrapper({ children }: WagmiWrapperProps): JSX.Element {
  return <WagmiConfig client={client}>{children}</WagmiConfig>;
}

export default WagmiWrapper;
