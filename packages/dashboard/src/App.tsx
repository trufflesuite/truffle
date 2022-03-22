import Dashboard from "./Dashboard";

import { Provider, defaultChains } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";

const connectors = [
  new InjectedConnector({ chains: defaultChains }),
  new WalletConnectConnector({
    chains: defaultChains,
    options: {
      // infuraId: 'Your infura id',
      qrcode: true
    }
  })
];

function App() {
  return (
    <Provider connectors={connectors}>
      <Dashboard />
    </Provider>
  );
}

export default App;
