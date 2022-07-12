import type { providers } from "ethers";
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
import type {
  Message,
  DashboardProviderMessage
} from "@truffle/dashboard-message-bus-common";
import {
  messageNeedsInteraction,
  messageIsUnsupported,
  rejectMessage,
  confirmMessage
} from "src/utils/dash";
import type noticeContentType from "src/components/composed/Notice/noticeContentType";

type actionType =
  | { type: "set-client"; data: DashboardMessageBusClient }
  | {
      type: "set-notice";
      data: { show: boolean; type: noticeContentType | null };
    }
  | {
      type: "handle-message";
      data: {
        lifecycle: ReceivedMessageLifecycle<Message>;
        provider: providers.JsonRpcProvider;
      };
    };

type stateType = {
  host: string;
  port: number;
  client: DashboardMessageBusClient | null;
  providerMessages: Map<
    number,
    ReceivedMessageLifecycle<DashboardProviderMessage>
  >;
  notice: {
    show: boolean;
    type: noticeContentType | null;
  };
};

const initialState: stateType = {
  host: window.location.hostname,
  port:
    process.env.NODE_ENV === "development"
      ? 24012
      : Number(window.location.port),
  client: null,
  providerMessages: new Map(),
  notice: {
    show: false,
    type: "LOADING"
  }
};

const reducer = (state: stateType, action: actionType): stateType => {
  const { type, data } = action;
  switch (type) {
    case "set-client":
      return { ...state, client: data };
    case "set-notice":
      return { ...state, notice: data };
    case "handle-message":
      const { lifecycle, provider } = data;
      const { message } = lifecycle;
      const { id } = message;
      const updatedProviderMessages = new Map(state.providerMessages);

      // Determine message type
      if (isDashboardProviderMessage(message)) {
        console.debug(`Received provider message (id: ${id})`, message);
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
export type { actionType, stateType };
