import { Message } from "@truffle/dashboard-message-bus-common";

export interface DashboardMessageBusConnectionOptions {
  host: string;
  port: number;
  connectionType: "publish" | "subscribe";
  pathPrefix?: string;
}

export interface SocketEventHandlerMap {
  [index: string]: (...args: any[]) => void;
}

export interface DashboardMessageBusConnectionEvents {
  message: (message: Message) => void;
}
