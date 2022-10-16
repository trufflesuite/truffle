import { providers } from "ethers";
import { openDB } from "idb";
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import {
  isDashboardProviderMessage,
  isInvalidateMessage,
  isLogMessage,
  isDebugMessage
} from "@truffle/dashboard-message-bus-common";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import {
  messageNeedsInteraction,
  messageIsUnsupported,
  rejectMessage,
  confirmMessage
} from "src/utils/dash";
import type { State, Action, Schema } from "src/contexts/DashContext";

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
  decoder: null,
  decoderCompilations: null,
  decoderCompilationHashes: null,
  // @ts-ignore
  provider: new providers.Web3Provider(window.ethereum),
  providerMessages: new Map(),
  chainInfo: {
    id: null,
    name: null
  },
  notice: {
    show: false,
    type: "LOADING"
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
    case "handle-message":
      const lifecycle = data;
      const { message } = lifecycle;

      // Determine message type

      // Return state directly for certain messages
      if (isLogMessage(message)) {
        window.devLog(`Received log message`, message);
        lifecycle.respond({ payload: undefined });
        return state;
      } else if (isDebugMessage(message)) {
        window.devLog("Received debug message", message);
        lifecycle.respond({ payload: undefined });
        return state;
      }

      // Copy, modify, and return new state for other messages
      const newState: State = {
        ...state,
        providerMessages: new Map(state.providerMessages)
      };

      if (isDashboardProviderMessage(message)) {
        window.devLog(
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
          confirmMessage(strictlyTypedLifecycle, state.provider);
        }
      } else if (isInvalidateMessage(message)) {
        window.devLog("Received invalidate message", message);
        const invalidatedID = message.payload;
        newState.providerMessages.delete(invalidatedID);
      }

      return newState;
    default:
      throw new Error("Undefined reducer action type");
  }
};
