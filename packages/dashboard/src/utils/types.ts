export type Request = BrowserProviderRequest;

export interface BrowserProviderRequest {
  id: number;
  type: "browser-provider";
  payload: {
    jsonrpc: "2.0";
    method: string;
    params: any[];
    id: number;
  };
}
