import { Message } from "@truffle/dashboard-message-bus-common";

export interface DashboardMessageBusClientOptions {
  host?: string;
  port?: number;
  subscribePort?: number;
  publishPort?: number;
  maxRetries?: number;
  retryDelayMsec?: number;
}

export interface ResolvedDashboardMessageBusClientOptions {
  host: string;
  port: number;
  subscribePort?: number;
  publishPort?: number;
  maxRetries: number;
  retryDelayMsec: number;
}

export interface SendOptions {
  type: string;
  payload: any;
}

export interface RespondOptions<MessageType extends Message> {
  id: number;
  payload: MessageType["payload"];
}
export interface SubscriptionOptions {
  id?: number;
  type?: string;
}
