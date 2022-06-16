import { Message } from "@truffle/dashboard-message-bus-common";

export interface DashboardMessageBusConnectionOptions {
  host: string;
  port: number;
  publishPort?: number;
  subscribePort?: number;
  connectionType: "publish" | "subscribe";
}

export interface DashboardMessageBusPublishConnectionOptions {
  host: string;
  port: number;
}

export type DashboardMessageBusSubscribeConnectionOptions =
  DashboardMessageBusPublishConnectionOptions;

export interface SocketEventHandlerMap {
  [index: string]: (...args: any[]) => void;
}

export interface DashboardMessageBusConnectionEvents {
  message: (message: Message) => void;
}
