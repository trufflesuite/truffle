import Dashboard from "./Dashboard";

import { Provider, chain, defaultChains, Connector } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";

import { getDefaultProvider, providers as ethproviders } from "ethers";
import { getNetwork } from "@ethersproject/providers";

const defaultChain = chain.mainnet;

const getProvider = (_config: { chainId?: number; connector?: Connector }) => {
  let wProvider: any = window.ethereum;
  console.log("getProvider", { wProvider, winEth: window.ethereum });
  let ret: any;
  if (!wProvider) {
    ret = getDefaultProvider(getNetwork(_config.chainId ?? defaultChain.id));
  } else {
    ret = new ethproviders.Web3Provider(wProvider);
  }
  console.log("getProvider.returning", {
    wProvider,
    winEth: window.ethereum,
    ret
  });
  return ret;
};

const connectors = [
  new InjectedConnector({ chains: defaultChains }),
  new WalletConnectConnector({
    chains: defaultChains,
    options: {
      qrcode: true
    }
  })
];

function App() {
  return (
    <Provider connectors={connectors} provider={getProvider}>
      <Dashboard />
    </Provider>
  );
}

export default App;
