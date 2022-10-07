import { useReducer, useEffect, useRef } from "react";
import { useAccount, useNetwork } from "wagmi";
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

      const { busClient, provider } = state;
      await busClient.ready();
      const { host, port } = busClient.options;
      window.devLog(`Connected to message bus at ws://${host}:${port}`);

      // Client subscribes to and handles messages
      const subscription = busClient.subscribe({});
      const messageHandler = (lifecycle: ReceivedMessageLifecycle<Message>) =>
        void dispatch({
          type: "handle-message",
          data: { lifecycle, provider }
        });
      subscription.on("message", messageHandler);
    }

    init();
  }, [state]);

  useEffect(() => {
    dispatch({
      type: "set-notice",
      data: { show: !isConnected, type: "CONNECT" }
    });
  }, [isConnected]);

  useEffect(() => {
    const updateChainInfo = () => {
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

    updateChainInfo();
  }, [chain]);

  const operations = {
    userConfirmMessage: async (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => await confirmMessage(lifecycle, state.provider),
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
