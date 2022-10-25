import { useReducer, useEffect, useRef, useMemo, useCallback } from "react";
import { useAccount, useNetwork } from "wagmi";
import { sha1 } from "object-hash";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import {
  isWorkflowCompileResultMessage,
  isLogMessage,
  isDebugMessage
} from "@truffle/dashboard-message-bus-common";
import type {
  Message,
  DashboardProviderMessage,
  WorkflowCompileResultMessage
} from "@truffle/dashboard-message-bus-common";
import { forProject } from "@truffle/decoder";
import type { Compilation } from "@truffle/compile-common";
import { DashContext, reducer, initialState } from "src/contexts/DashContext";
import type { State } from "src/contexts/DashContext";
import {
  confirmMessage,
  rejectMessage,
  getChainNameByID
} from "src/utils/dash";

const ARBITRARY_DB_MAX_BYTES = 500_000_000;
const ARBITRARY_DB_MAX_PERCENT = 0.8;

type DashProviderProps = {
  children: React.ReactNode;
};

function DashProvider({ children }: DashProviderProps): JSX.Element {
  const { isConnected } = useAccount();
  const { chain } = useNetwork();
  const [state, dispatch] = useReducer(reducer, initialState);
  const initCalled = useRef(false);
  const stateRef = useRef<State>(state);
  stateRef.current = state;

  console.debug({ state });

  const dbHelper = useMemo(
    () => ({
      dbPromise: stateRef.current.dbPromise,
      async has(hash: string) {
        return !!(await (await this.dbPromise).getKey("Compilation", hash));
      },
      async insert(hash: string, compilation: Compilation) {
        (await this.dbPromise).put("Compilation", {
          dataHash: hash,
          data: compilation,
          timeAdded: Date.now()
        });
      },
      async canInsert() {
        const { usage, quota } = await navigator.storage.estimate();
        if (usage && quota) {
          return (
            usage / quota < ARBITRARY_DB_MAX_PERCENT &&
            usage < ARBITRARY_DB_MAX_BYTES
          );
        }
      },
      async prune() {
        if (await this.canInsert()) return;

        const dbProxy = await this.dbPromise;
        const transaction = dbProxy.transaction("Compilation", "readwrite");
        const index = transaction.store.index("TimeAdded");

        for await (const cursor of index.iterate(null, "next")) {
          await cursor.delete();
          if (await this.canInsert()) {
            break;
          }
        }
      }
    }),
    []
  );

  const handleWorkflowCompileResultMessage = useCallback(
    async (message: WorkflowCompileResultMessage) => {
      const { compilations } = message.payload;

      if (compilations.length === 0 || !stateRef.current.decoder) return;

      let decoderNeedsUpdate = false;
      const decoderCompilations = [...stateRef.current.decoderCompilations!];
      const decoderCompilationHashes = new Set(
        stateRef.current.decoderCompilationHashes
      );

      // Iterate over incoming compilations and determine if they are useful to
      // in-memory decoder or db.
      // Do not try to optimize by:
      // - Batch inserting.
      // - Mirroring some kind of db state.
      for (const compilation of compilations) {
        const hash = sha1(compilation);

        // If the in-memory decoder doesn't have this compilation,
        // save it for decoder re-init after this for-loop ends.
        const isNewToDecoder =
          !stateRef.current.decoderCompilationHashes!.has(hash) &&
          !decoderCompilationHashes.has(hash);
        if (isNewToDecoder) {
          decoderCompilations.push(compilation);
          decoderCompilationHashes.add(hash);
          decoderNeedsUpdate = true;
        }

        // If db doesn't have this compilation,
        // delete old compilations (if necessary) and insert.
        const isNewToDb = !(await dbHelper.has(hash));
        if (isNewToDb) {
          await dbHelper.prune();
          try {
            await dbHelper.insert(hash, compilation);
          } catch (err) {
            console.error(err);
          }
        }
      }

      if (decoderNeedsUpdate) {
        const decoder = await forProject({
          projectInfo: { commonCompilations: decoderCompilations },
          // @ts-ignore
          provider: window.ethereum
        });
        dispatch({
          type: "set-decoder",
          data: {
            decoder,
            decoderCompilations,
            decoderCompilationHashes
          }
        });
      }
    },
    [dbHelper]
  );

  useEffect(() => {
    // This obviates the need for a cleanup callback
    if (initCalled.current) return;
    initCalled.current = true;

    const initBusClient = async () => {
      const { busClient } = state;
      await busClient.ready();
      const { host, port } = busClient.options;
      console.debug(`Connected to message bus at ws://${host}:${port}`);

      // Message bus client subscribes to and handles messages
      const subscription = busClient.subscribe({});
      const messageHandler = async (
        lifecycle: ReceivedMessageLifecycle<Message>
      ) => {
        const { message } = lifecycle;
        if (isWorkflowCompileResultMessage(message)) {
          // Handle WorkflowCompileResultMessage separately because:
          // a) Db operations are async
          // b) Avoid duplicate work (e.g. loop, hash)
          console.debug("Received workflow-compile-result message", message);
          handleWorkflowCompileResultMessage(message);
        } else if (isLogMessage(message)) {
          // Log messages do not alter state, not sending to reducer
          console.debug(`Received log message`, message);
          lifecycle.respond({ payload: undefined });
        } else if (isDebugMessage(message)) {
          // Debug messages do not alter state, not sending to reducer
          console.debug("Received debug message", message);
          lifecycle.respond({ payload: undefined });
        } else {
          // Other messages do alter state
          dispatch({
            type: "handle-message",
            data: lifecycle
          });
        }
      };
      subscription.on("message", messageHandler);
    };

    const initDecoder = async () => {
      const { dbPromise, provider } = state;
      const compilationStore = await (await dbPromise).getAll("Compilation");
      console.debug(`Compilation store`, compilationStore);

      const decoderCompilations: State["decoderCompilations"] = new Array(
        compilationStore.length
      );
      const decoderCompilationHashes: State["decoderCompilationHashes"] =
        new Set();
      compilationStore.forEach((row, index) => {
        decoderCompilations[index] = row.data;
        decoderCompilationHashes.add(row.dataHash);
      });

      const decoder = await forProject({
        projectInfo: { commonCompilations: decoderCompilations },
        // @ts-ignore
        provider: window.ethereum
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
      await initDecoder();
      await initBusClient();
    };

    init();
  }, [state, handleWorkflowCompileResultMessage]);

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
