import Dashboard from "./Dashboard";

import {Provider, chain, defaultChains, Connector} from 'wagmi';
import {InjectedConnector} from 'wagmi/connectors/injected';
import {WalletConnectConnector} from 'wagmi/connectors/walletConnect';

import {getDefaultProvider, providers as ethproviders} from "ethers";
import {getNetwork} from "@ethersproject/providers";

const defaultChain = chain.mainnet;

const getProvider = (_config: { chainId?: number; connector?: Connector }) => {
  let wProvider = _config.connector?.getProvider(true);
  console.debug("getProvider", {wProvider, winEth: window.ethereum, _config, INFURA_ID: process.env.REACT_APP_INFURA_ID});
  let ret: any;
  if (!wProvider) {
    ret = getDefaultProvider(getNetwork(_config.chainId ?? defaultChain.id));
  } else {
    wProvider.enable()
      .then((r: any) => console.debug(r))
      .catch((e: any) => console.error(e));
    ret = new ethproviders.Web3Provider(wProvider);
  }
  console.debug("getProvider.returning", {wProvider, winEth: window.ethereum, ret});
  return ret;
};

const connectors = [
  new InjectedConnector({chains: defaultChains}),
  new WalletConnectConnector({
    chains: defaultChains,
    options: {
      infuraId: process.env.REACT_APP_INFURA_ID,
      qrcode: true,
    },
  }),
];

function App() {
  return (
    <Provider connectors={connectors} provider={getProvider}>
      <Dashboard/>
    </Provider>
  );
}

export default App;
