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
import type { State, Action } from "src/contexts/DashContext";

export const initialState: State = {
  host: window.location.hostname,
  port:
    process.env.NODE_ENV === "development"
      ? 24012
      : Number(window.location.port),
  client: null,
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
    case "set-client":
      return { ...state, client: data };
    case "set-chain-info":
      return { ...state, chainInfo: data };
    case "set-notice":
      return { ...state, notice: { ...state.notice, ...data } };
    case "handle-message":
      const { lifecycle, provider } = data;
      const { message } = lifecycle;
      const { id } = message;
      const updatedProviderMessages = new Map(state.providerMessages);

      // Determine message type
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
          updatedProviderMessages.set(id, strictlyTypedLifecycle);
        } else {
          // Confirm supported and non-interactive messages
          confirmMessage(strictlyTypedLifecycle, provider);
        }
      } else if (isInvalidateMessage(message)) {
        window.devLog("Received invalidate message", message);
        const invalidatedID = message.payload;
        updatedProviderMessages.delete(invalidatedID);
      } else if (isLogMessage(message)) {
        window.devLog(`Received log message`, message);
        lifecycle.respond({ payload: undefined });
      } else if (isDebugMessage(message)) {
        window.devLog("Received debug message", message);
        lifecycle.respond({ payload: undefined });
      }

      return { ...state, providerMessages: updatedProviderMessages };
    default:
      throw new Error("Undefined reducer action type");
  }
};
