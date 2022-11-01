import { openDB } from "idb/with-async-ittr";
import ganache from "ganache";
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
  providerMessages: new Map(),
  simulations: new Map(),
  simulationNonce: 0,
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
    case "add-simulation":
      const label = data.label || `Simulation ${state.simulationNonce}`;
      const provider = ganache.provider({ fork: { network: "mainnet" } });
      const simulation = { label, provider };

      const newSimulations = new Map(state.simulations);
      newSimulations.set(state.simulationNonce, simulation);
      return {
        ...state,
        simulations: newSimulations,
        simulationNonce: state.simulationNonce + 1
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
    default:
      throw new Error("Undefined reducer action type");
  }
};
