import { useReducer } from "react";
import { useAccount } from "wagmi";
import { useDidUpdate } from "@mantine/hooks";
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";
import { DashContext } from "src/contexts/DashContext";
import { reducer, initialState } from "src/contexts/DashContext/state";

type DashProviderProps = {
  children: React.ReactNode;
};

function DashProvider({ children }: DashProviderProps): JSX.Element {
  const { isConnected } = useAccount();
  const [state, dispatch] = useReducer(reducer, initialState);

  useDidUpdate(() => {
    async function init() {
      console.debug("Called init() in <DashProvider />");
      const { host, port } = state;
      const client = new DashboardMessageBusClient({ host, port });
      await client.ready();
      dispatch({ type: "set-client", data: client });
    }

    if (isConnected) {
      init();
    }
  }, [isConnected]);

  return (
    <DashContext.Provider value={{ state, dispatch }}>
      {children}
    </DashContext.Provider>
  );
}

export default DashProvider;
