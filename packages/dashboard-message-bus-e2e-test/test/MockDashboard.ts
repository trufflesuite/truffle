import {
  DashboardProviderMessage,
  dashboardProviderMessageType
} from "@truffle/dashboard-message-bus-common";

import {
  DashboardMessageBusClient,
  DashboardMessageBusClientOptions,
  ReceivedMessageLifecycle
} from "@truffle/dashboard-message-bus-client";

import type { JSONRPCRequestPayload } from "ethereum-protocol";
import { EthereumProvider } from "ganache";

import delay from "delay";

export default class MockDashboard {
  client?: DashboardMessageBusClient;

  private _connecting: boolean = false;
  private _connected: boolean = false;

  constructor(public forwardProvider: EthereumProvider) {}

  async connect(options: DashboardMessageBusClientOptions): Promise<void> {
    if (this._connected) {
      return;
    }

    if (this._connecting) {
      await delay(10);
      return this.connect(options);
    }

    this._connecting = true;

    try {
      this.client = new DashboardMessageBusClient(options);
      await this.client.ready();
      this._connected = true;

      const providerSubscription =
        this.client.subscribe<DashboardProviderMessage>({
          type: dashboardProviderMessageType
        });
      providerSubscription.on("message", this.handleIncomingMessage.bind(this));
    } finally {
      this._connecting = false;
    }
  }

  async disconnect() {
    await this.client?.close();
    delete this.client;
    this._connected = false;
  }

  private async handleIncomingMessage(
    messageLifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
  ) {
    const responsePayload = await forwardDashboardProviderRequest(
      this.forwardProvider,
      messageLifecycle.message.payload
    );

    messageLifecycle.respond({ payload: responsePayload });
  }
}

export const forwardDashboardProviderRequest = async (
  provider: EthereumProvider,
  payload: JSONRPCRequestPayload
) => {
  try {
    const { method, params } = payload;

    // yeah, the any below is ugly, but the ganache API doesn't appear to expose
    // a method type that I can easily import and use
    const result = await provider.request({ method, params } as any);
    const reply = {
      jsonrpc: payload.jsonrpc,
      id: payload.id,
      result
    };

    return reply;
  } catch (error) {
    return {
      jsonrpc: payload.jsonrpc,
      id: payload.id,
      error
    };
  }
};
