import { openDB } from "idb/with-async-ittr";
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import {
  isDashboardProviderMessage,
  isInvalidateMessage
} from "@truffle/dashboard-message-bus-common";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import {
  messageNeedsInteraction,
  messageIsUnsupported,
  rejectMessage,
  confirmMessage
} from "src/utils/dash";
import type { InteractiveRpcMethod } from "src/utils/constants";
import type { State, Action, Schema } from "src/contexts/DashContext";

type Breakpoint = {
  line: number;
  sourceId: string;
};

const DB_NAME = "TruffleDashboard";
const DB_VERSION = 1;

export const initialState: State = {
  busClient: new DashboardMessageBusClient({
    host: window.location.hostname,
    port:
      process.env.NODE_ENV === "development"
        ? 24012
        : Number(window.location.port)
  }),
  dbPromise: openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const compilationStore = db.createObjectStore("Compilation", {
        keyPath: "dataHash"
      });
      compilationStore.createIndex("TimeAdded", "timeAdded", {
        unique: false
      });
    }
  }),
  debugger: {
    sources: null,
    session: null,
    txToRun: null,
    breakpoints: {}
  },
  decoder: null,
  decoderCompilations: null,
  decoderCompilationHashes: null,
  providerMessages: new Map(),
  chainInfo: {
    id: null,
    name: null
  },
  notice: {
    show: false,
    type: "LOADING"
  },
  analyticsConfig: {
    enableAnalytics: null,
    analyticsSet: null,
    analyticsMessageDateTime: null
  }
};

export const reducer = (state: State, action: Action): State => {
  const { type, data } = action;
  switch (type) {
    case "set-decoder":
      return { ...state, ...data };
    case "set-chain-info":
      return { ...state, chainInfo: data };
    case "set-notice":
      return { ...state, notice: { ...state.notice, ...data } };
    case "set-analytics-config":
      return { ...state, analyticsConfig: data };
    case "toggle-debugger-breakpoint":
      const { line, sourceId } = data;
      const breakpointExists = state.debugger.breakpoints![sourceId].has(line);
      const newBreakpointStateForSource = new Set(
        state.debugger.breakpoints![sourceId]
      );
      if (breakpointExists) {
        // @ts-ignore
        state.debugger.session!.removeBreakpoint({ line, sourceId });
        newBreakpointStateForSource.delete(line);
      } else {
        // @ts-ignore
        state.debugger.session!.addBreakpoint({ line, sourceId });
        newBreakpointStateForSource.add(line);
      }
      return {
        ...state,
        debugger: {
          ...state.debugger,
          breakpoints: {
            ...state.debugger.breakpoints,
            [sourceId]: newBreakpointStateForSource
          }
        }
      };
    case "set-debugger-session-data":
      const breakpointsInitialState: { [sourceId: string]: Set<number> } = {};
      for (const source of data.sources) {
        breakpointsInitialState[source.id] = new Set();
      }
      return {
        ...state,
        debugger: {
          // @ts-ignore
          ...data,
          breakpoints: breakpointsInitialState
        }
      };
    case "handle-message":
      // Copy state,
      // modify it depending on message type,
      // return new state.
      const lifecycle = data;
      const { message } = lifecycle;

      const newState: State = {
        ...state,
        providerMessages: new Map(state.providerMessages)
      };

      if (isDashboardProviderMessage(message)) {
        console.debug(
          `Received provider message: ${message.payload.method}`,
          message
        );
        const strictlyTypedLifecycle =
          lifecycle as ReceivedMessageLifecycle<DashboardProviderMessage>;
        if (messageIsUnsupported(message)) {
          rejectMessage(strictlyTypedLifecycle, "UNSUPPORTED");
        } else if (messageNeedsInteraction(message)) {
          newState.providerMessages.set(message.id, strictlyTypedLifecycle);
        } else {
          // Confirm supported and non-interactive messages
          confirmMessage(strictlyTypedLifecycle);
        }
      } else if (isInvalidateMessage(message)) {
        console.debug("Received invalidate message", message);
        const invalidatedID = message.payload;
        newState.providerMessages.delete(invalidatedID);
      }

      return newState;
    case "set-tx-to-run":
      return {
        ...state,
        debugger: {
          ...state.debugger,
          txToRun: data
        }
      };
    case "update-provider-message-sender":
      const newProviderMessages = new Map(state.providerMessages);
      const newSender = data;

      for (const [id, lifecycle] of newProviderMessages) {
        const { message } = lifecycle;
        const newParams = message.payload.params;

        switch (message.payload.method as InteractiveRpcMethod) {
          case "eth_sendTransaction":
            newParams[0].from = newSender;
            break;
          case "personal_sign":
            newParams[1] = newSender;
            break;
          case "eth_signTypedData_v3":
          case "eth_signTypedData_v4":
            newParams[0] = newSender;
            break;
        }

        lifecycle.message.payload.params = newParams;
        newProviderMessages.set(id, lifecycle);
      }

      return { ...state, providerMessages: newProviderMessages };
    default:
      throw new Error("Undefined reducer action type");
  }
};
