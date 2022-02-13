import { getLibrary } from "./utils/utils";
import { Web3ReactProvider } from "@web3-react/core";
import Dashboard from "./Dashboard";

function App() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Dashboard />
    </Web3ReactProvider>
  );
}

export default App;
