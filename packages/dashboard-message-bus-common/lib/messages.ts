export interface Message {
  id: number;
  type?: string;
  payload: any;
}

export interface Response {
  id: number;
  payload: any;
}

export type DashboardProviderMessageType = "provider";
export const dashboardProviderMessageType = "provider";
/**
 * Message intended to be passed on to the injected provider of a dashboard instance.
 * The message payload is an RPC request that should be forwarded.
 */
export interface DashboardProviderMessage extends Message {
  type: DashboardProviderMessageType;
  payload: {
    jsonrpc: "2.0";
    method: string;
    params: any[];
    id: number;
  };
}

export type LogMessageType = "log";
export const logMessageType = "log";

/**
 * Message intended to log messages across the message bus.
 * The message payload includes a "debug" namespace as well as a message.
 * This is an internal message type that is not intended to be used by publishers or subscribers.
 */
export interface LogMessage extends Message {
  type: LogMessageType;
  payload: {
    namespace: string;
    message: any;
  };
}

export type DebugMessageType = "debug";
export const debugMessageType = "debug";

/**
 * Message to log in Dashboard browser console
 */
export interface DebugMessage extends Message {
  type: DebugMessageType;
  payload: {
    message: string;
  };
}

export type InvalidateMessageType = "invalidate";
export const invalidateMessageType = "invalidate";
/**
 * Message intended to invalidate earlier messages.
 * The payload is the ID of the message that should be invalidated.
 * This is an internal message type that is not intended to be used by publishers or subscribers.
 */
export interface InvalidateMessage extends Message {
  type: InvalidateMessageType;
  payload: number;
}

export const isDashboardProviderMessage = (
  message: Message
): message is DashboardProviderMessage => {
  return message.type === dashboardProviderMessageType;
};

export const isLogMessage = (message: Message): message is LogMessage => {
  return message.type === logMessageType;
};

export const isDebugMessage = (message: Message): message is DebugMessage => {
  return message.type === debugMessageType;
};

export const isInvalidateMessage = (
  message: Message
): message is InvalidateMessage => {
  return message.type === invalidateMessageType;
};

export type MessageType =
  | DashboardProviderMessageType
  | LogMessageType
  | DebugMessageType
  | InvalidateMessageType;
