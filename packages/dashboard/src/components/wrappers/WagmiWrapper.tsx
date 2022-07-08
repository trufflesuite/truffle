import { WagmiConfig, createClient } from "wagmi";
import { getDefaultProvider } from "ethers";

const client = createClient({
  autoConnect: true,
  provider: getDefaultProvider()
});

type WagmiWrapperProps = {
  children: React.ReactNode;
};

function WagmiWrapper({ children }: WagmiWrapperProps): JSX.Element {
  return <WagmiConfig client={client}>{children}</WagmiConfig>;
}

export default WagmiWrapper;
