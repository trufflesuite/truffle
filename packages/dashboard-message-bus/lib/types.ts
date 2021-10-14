export * from "./message/types";

export interface PortsConfig {
  dashboardPort: number;
  messageBusListenPort: number;
  messageBusRequestsPort: number;
}
