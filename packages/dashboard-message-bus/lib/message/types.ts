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
  payload: string;
}

export interface InvalidateMessage extends Message {
  type: "invalidate";
  payload: number;
}
