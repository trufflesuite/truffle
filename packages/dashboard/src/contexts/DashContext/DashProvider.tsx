import { useReducer, useEffect, useRef } from "react";
import { useAccount, useNetwork } from "wagmi";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type {
  Message,
  DashboardProviderMessage
} from "@truffle/dashboard-message-bus-common";
import { forProject } from "@truffle/decoder";
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
  const initFinished = useRef(false);

  window.devLog({ state });

  useEffect(() => {
    const initBusClient = async () => {
      const { busClient } = state;
      await busClient.ready();
      const { host, port } = busClient.options;
      window.devLog(`Connected to message bus at ws://${host}:${port}`);

      // Message bus client subscribes to and handles messages
      const subscription = busClient.subscribe({});
      const messageHandler = (lifecycle: ReceivedMessageLifecycle<Message>) =>
        void dispatch({
          type: "handle-message",
          data: lifecycle
        });
      subscription.on("message", messageHandler);
    };

    const initDecoder = async () => {
      const { dbPromise, provider } = state;
      const compilationStore = await (await dbPromise).getAll("Compilation");
      window.devLog(`Compilation store`, compilationStore);

      const decoderCompilations: State["decoderCompilations"] = new Array(
        compilationStore.length
      );
      const decoderCompilationHashes: State["decoderCompilationHashes"] =
        new Set();
      compilationStore.forEach(row => {
        decoderCompilations.push(row.data);
        decoderCompilationHashes.add(row.dataHash);
      });

      const decoder = await forProject({
        projectInfo: { commonCompilations: decoderCompilations },
        // @ts-ignore
        provider
      });
      dispatch({
        type: "set-decoder",
        data: {
          decoder,
          decoderCompilations,
          decoderCompilationHashes
        }
      });
    };

    const init = async () => {
      // This obviates the need for a cleanup callback
      if (initCalled.current) return;

      initCalled.current = true;
      await initBusClient();
      await initDecoder();
      initFinished.current = true;
    };

    init();
  }, [state]);

  useEffect(() => {
    const updateDecoder = async () => {
      const newDecoder = await forProject({
        projectInfo: { commonCompilations: state.decoderCompilations! },
        // @ts-ignore
        provider: state.provider
      });
      dispatch({ type: "set-decoder", data: { decoder: newDecoder } });
    };

    if (initFinished.current) updateDecoder();
  }, [state.decoderCompilations, state.provider]);

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

  useEffect(() => {
    dispatch({
      type: "set-notice",
      data: { show: !isConnected, type: "CONNECT" }
    });
  }, [isConnected]);

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
