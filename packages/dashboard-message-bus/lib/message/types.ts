export interface Message {
  id: number;
  type: string;
  payload: any;
}

/**
 * Message intended to be passed on to the injected provider of a dashboard instance.
 * The message payload is an RPC request that should be forwarded.
 */
export interface DashboardProviderMessage extends Message {
  type: "provider";
  payload: {
    jsonrpc: "2.0";
    method: string;
    params: any[];
    id: number;
  };
}

/**
 * Message intended to log messages across the message bus.
 * The message payload includes a "debug" namespace as well as a message.
 * This is an internal message type that is not intended to be used by publishers or subscribers.
 */
export interface LogMessage extends Message {
  type: "log";
  payload: {
    namespace: string;
    message: any;
  };
}

/**
 * Message intended to invalidate earlier messages.
 * The payload is the ID of the message that should be invalidated.
 * This is an internal message type that is not intended to be used by publishers or subscribers.
 */
export interface InvalidateMessage extends Message {
  type: "invalidate";
  payload: number;
}

export const isDashboardProviderMessage = (
  message: Message
): message is DashboardProviderMessage => {
  return message.type === "provider";
};

export const isLogMessage = (message: Message): message is LogMessage => {
  return message.type === "log";
};

export const isInvalidateMessage = (
  message: Message
): message is InvalidateMessage => {
  return message.type === "invalidate";
};
