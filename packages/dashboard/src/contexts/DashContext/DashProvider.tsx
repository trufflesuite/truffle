import { useReducer, useEffect, useRef } from "react";
import { useAccount, useProvider, useNetwork } from "wagmi";
import type { providers } from "ethers";
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type {
  Message,
  DashboardProviderMessage
} from "@truffle/dashboard-message-bus-common";
import { DashContext, reducer, initialState } from "src/contexts/DashContext";
import type { State } from "src/contexts/DashContext";
import {
  confirmMessage,
  rejectMessage,
  getChainNameByID
} from "src/utils/dash";

type DashProviderProps = {
  children: React.ReactNode;
};

function DashProvider({ children }: DashProviderProps): JSX.Element {
  const { isConnected } = useAccount();
  const provider: providers.Web3Provider = useProvider();
  const { chain } = useNetwork();
  const [state, dispatch] = useReducer(reducer, initialState);
  const initCalled = useRef(false);

  window.devLog({ state });
  useEffect(() => {
    async function init() {
      // This obviates the need for a cleanup callback
      if (initCalled.current) {
        return;
      }
      initCalled.current = true;

      window.devLog("Initializing message bus client");
      // Create message bus client
      const { host, port } = state;
      const client = new DashboardMessageBusClient({ host, port });
      await client.ready();
      dispatch({ type: "set-client", data: client });
      window.devLog(`Connected to message bus at ws://${host}:${port}`);

      // Client subscribes to and handles messages
      const subscription = client.subscribe({});
      const messageHandler = (lifecycle: ReceivedMessageLifecycle<Message>) =>
        void dispatch({
          type: "handle-message",
          data: { lifecycle, provider }
        });
      subscription.on("message", messageHandler);
    }

    init();
  }, [state, provider]);

  useEffect(() => {
    dispatch({
      type: "set-notice",
      data: { show: !isConnected, type: "CONNECT" }
    });
  }, [isConnected]);

  useEffect(() => {
    const updateChangeInfo = () => {
      const data: State["chainInfo"] = { id: null, name: null };

      if (chain) {
        const { id, name } = chain;
        let updated;
        if (name === `Chain ${id}`) {
          updated = getChainNameByID(id);
        }
        data.id = id;
        data.name = updated ?? name;
        dispatch({
          type: "set-notice",
          data: { show: true, type: "CONFIRM_CHAIN" }
        });
      }

      dispatch({ type: "set-chain-info", data });
    };

    updateChangeInfo();
  }, [chain]);

  const operations = {
    userConfirmMessage: async (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => await confirmMessage(lifecycle, provider),
    userRejectMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => void rejectMessage(lifecycle, "USER"),
    toggleNotice: () =>
      void dispatch({ type: "set-notice", data: { show: !state.notice.show } })
  };

  return (
    <DashContext.Provider value={{ state, operations }}>
      {children}
    </DashContext.Provider>
  );
}

export default DashProvider;
