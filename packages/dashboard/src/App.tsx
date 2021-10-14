import { getLibrary } from "./utils/utils";
import { useEffect } from "react";
import { Web3ReactProvider } from "@web3-react/core";
import Dashboard from "./Dashboard";

function App() {
  // Add warning when trying to close the app
  useEffect(() => {
    window.onbeforeunload = function (e: any) {
      e.returnValue = "";
      return "";
    };
  }, []);

  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Dashboard />
    </Web3ReactProvider>
  );
}

export default App;
