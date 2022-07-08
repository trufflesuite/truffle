import type {
  DashboardMessageBusClient,
  ReceivedMessageLifecycle
} from "@truffle/dashboard-message-bus-client";
import {
  isDashboardProviderMessage,
  isInvalidateMessage,
  isLogMessage,
  isDebugMessage
} from "@truffle/dashboard-message-bus-common";
import type { Message } from "@truffle/dashboard-message-bus-common";

type actionType =
  | { type: "set-client"; data: DashboardMessageBusClient }
  | { type: "handle-message"; data: ReceivedMessageLifecycle<Message> };

type stateType = {
  host: string;
  port: number;
  client: DashboardMessageBusClient | null;
  providerMessages: Map<number, ReceivedMessageLifecycle<Message>>;
};

const initialState: stateType = {
  host: window.location.hostname,
  port:
    process.env.NODE_ENV === "development"
      ? 24012
      : Number(window.location.port),
  client: null,
  providerMessages: new Map()
};

const reducer = (state: stateType, action: actionType): stateType => {
  const { type, data } = action;
  switch (type) {
    case "set-client":
      return { ...state, client: data };
    case "handle-message":
      const lifecycle = data;
      const message = lifecycle.message;
      const { id } = message;
      const updatedProviderMessages = new Map(state.providerMessages);
      if (isDashboardProviderMessage(message)) {
        console.debug(`Received provider message (id: ${id})`, message);
        updatedProviderMessages.set(id, lifecycle);
      } else if (isInvalidateMessage(message)) {
        console.debug(`Received invalidate message (id: ${id})`, message);
        const invalidatedID = message.payload;
        updatedProviderMessages.delete(invalidatedID);
      } else if (isLogMessage(message)) {
        console.debug(`Received log message (id: ${id})`, message);
        lifecycle.respond({ payload: undefined });
      } else if (isDebugMessage(message)) {
        console.debug(`Received debug message (id: ${id})`, message);
        lifecycle.respond({ payload: undefined });
      }
      return { ...state, providerMessages: updatedProviderMessages };
    default:
      throw new Error("Undefined reducer action type");
  }
};

export { initialState, reducer };
