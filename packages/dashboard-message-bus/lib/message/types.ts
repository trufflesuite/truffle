export interface Message {
  id: number;
  type: string;
  payload: any;
}

export interface DashboardProviderMessage extends Message {
  type: "dashboard-provider";
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

export const isDashboardProviderMessage = (
  message: Message
): message is DashboardProviderMessage => {
  return message.type === "dashboard-provider";
};

export const isLogMessage = (message: Message): message is LogMessage => {
  return message.type === "log";
};

export const isInvalidateMessage = (
  message: Message
): message is InvalidateMessage => {
  return message.type === "invalidate";
};
