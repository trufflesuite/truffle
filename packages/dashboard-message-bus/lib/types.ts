import WebSocket from "isomorphic-ws";

export * from "./message/types";

export interface UnfulfilledRequest {
  socket: WebSocket;
  data: WebSocket.Data;
}

export interface PortsConfig {
  dashboardPort: number;
  messageBusListenPort: number;
  messageBusRequestsPort: number;
}
