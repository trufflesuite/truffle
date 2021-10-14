export interface Message {
  id: number;
  type: string;
  payload: any;
}

export interface BrowserProviderMessage extends Message {
  type: "browser-provider";
  payload: {
    jsonrpc: "2.0";
    method: string;
    params: any[];
    id: number;
  };
}

export interface LogMessage extends Message {
  type: "log";
  payload: {
    namespace: string;
    message: any;
  };
}

export interface InvalidateMessage extends Message {
  type: "invalidate";
  payload: number;
}

export const isBrowserProviderMessage = (
  message: Message
): message is BrowserProviderMessage => {
  return message.type === "browser-provider";
};

export const isLogMessage = (message: Message): message is LogMessage => {
  return message.type === "log";
};

export const isInvalidateMessage = (
  message: Message
): message is InvalidateMessage => {
  return message.type === "invalidate";
};
