import { useReducer, useEffect } from "react";
import { useDidUpdate } from "@mantine/hooks";
import { useAccount, useProvider } from "wagmi";
import type { providers } from "ethers";
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { Message } from "@truffle/dashboard-message-bus-common";
import { DashContext } from "src/contexts/DashContext";
import { reducer, initialState } from "src/contexts/DashContext/state";

type DashProviderProps = {
  children: React.ReactNode;
};

function DashProvider({ children }: DashProviderProps): JSX.Element {
  const { isConnected } = useAccount();
  const provider: providers.Web3Provider = useProvider();
  const [state, dispatch] = useReducer(reducer, initialState);

  console.debug({ state });
  useDidUpdate(() => {
    async function init() {
      console.debug("Called init() in <DashProvider />");

      // Create message bus client
      const { host, port } = state;
      const client = new DashboardMessageBusClient({ host, port });
      await client.ready();
      dispatch({ type: "set-client", data: client });
      console.debug(`Connected to message bus at ws://${host}:${port}`);

      // Client subscribes to and handles messages
      const subscription = client.subscribe({});
      const messageHandler = (lifecycle: ReceivedMessageLifecycle<Message>) =>
        void dispatch({
          type: "handle-message",
          data: { lifecycle, provider }
        });
      subscription.on("message", messageHandler);

      // Clean up
      return () => {
        subscription.removeAllListeners();
        client.close();
      };
    }

    return init();
  }, []);

  useEffect(() => {
    dispatch({
      type: "set-notice",
      data: {
        show: !isConnected,
        type: "CONNECT"
      }
    });
  }, [isConnected]);

  return (
    <DashContext.Provider value={{ state, dispatch }}>
      {children}
    </DashContext.Provider>
  );
}

export default DashProvider;
