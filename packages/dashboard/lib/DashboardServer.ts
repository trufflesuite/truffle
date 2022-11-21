import express, { Application, NextFunction, Request, Response } from "express";
import path from "path";
import open from "open";
import {
  dashboardProviderMessageType,
  LogMessage,
  logMessageType
} from "@truffle/dashboard-message-bus-common";

import { DashboardMessageBus } from "@truffle/dashboard-message-bus";
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";
import cors from "cors";
import type { Server } from "http";
import { createServer } from "http";
import debugModule from "debug";
import { resolveBindHostnameToAllIps } from "./utils";

export interface DashboardServerOptions {
  /** Port of the dashboard */
  port: number;

  /**
   * The HTTP path prefix for the dashboard message bus to use.
   *
   * @default "/"
   * */
  pathPrefix?: string;

  /**
   * Host of the dashboard
   * @default "localhost"
   */
  host?: string;

  /**
   * Boolean indicating whether the POST /rpc endpoint should be exposed.
   * @default true
   */
  rpc?: boolean;

  /**
   * Boolean indicating whether debug output should be logged.
   * @default false
   */
  verbose?: boolean;

  /**
   * Boolean indicating whether whether starting the DashboardServer should
   * automatically open the dashboard.
   * @default true
   */
  autoOpen?: boolean;
}

export class DashboardServer {
  port: number;
  host: string;
  rpc: boolean;
  verbose: boolean;
  autoOpen: boolean;
  frontendPath: string;

  private expressApp?: Application;
  private httpServers: Server[] = [];
  private messageBus?: DashboardMessageBus;
  private client?: DashboardMessageBusClient;

  constructor(options: DashboardServerOptions) {
    this.host = options.host ?? "localhost";
    this.port = options.port;
    this.rpc = options.rpc ?? true;
    this.verbose = options.verbose ?? false;
    this.autoOpen = options.autoOpen ?? true;
    this.frontendPath = path.join(__dirname, "dashboard-frontend");

    this.stop = this.stop.bind(this);
  }

  async start() {
    // if we've initialized the httpServers array, we're already listening.
    if (this.httpServers.length > 0) {
      return;
    }

    this.createExpressApp();
    await this.startHttpServers();

    this.messageBus = await this.startMessageBus();

    if (this.rpc) {
      await this.connectToMessageBus();
    }

    if (this.autoOpen) {
      const host = this.host === "0.0.0.0" ? "localhost" : this.host;
      open(`http://${host}:${this.port}`);
    }
  }

  async stop() {
    this.messageBus?.off("terminate", this.stop);

    await Promise.all([
      this.client?.close(),
      this.messageBus?.terminate(),
      ...this.httpServers.map(
        server => new Promise(resolve => server.close(resolve))
      )
    ]);
    delete this.client;
  }

  private createExpressApp() {
    if (this.expressApp) {
      return;
    }

    this.expressApp = express();

    this.expressApp.use(cors());
    this.expressApp.use(express.json());

    if (this.rpc) {
      this.expressApp.post("/rpc", this.postRpc.bind(this));
    }

    this.expressApp.use(express.static(this.frontendPath));
    this.expressApp.get("*", (_req, res) => {
      res.sendFile("index.html", { root: this.frontendPath });
    });
  }

  private async startHttpServers() {
    const bindIpAddresses = await resolveBindHostnameToAllIps(this.host);

    this.httpServers = await Promise.all(
      bindIpAddresses.map(bindIpAddress => {
        const server = createServer(this.expressApp);
        return new Promise<Server>(resolve => {
          server.listen({ host: bindIpAddress, port: this.port }, () =>
            resolve(server)
          );
        });
      })
    );
  }

  private postRpc(req: Request, res: Response, next: NextFunction) {
    if (!this.client) {
      throw new Error("Not connected to message bus");
    }

    this.client
      .publish({ type: dashboardProviderMessageType, payload: req.body })
      .then(lifecycle => lifecycle.response)
      .then(response => res.json(response?.payload))
      .catch(next);
  }

  private async startMessageBus() {
    const messageBus = new DashboardMessageBus({
      httpServers: this.httpServers
    });

    await messageBus.start();
    messageBus.on("terminate", this.stop);

    return messageBus;
  }

  private async connectToMessageBus() {
    if (!this.messageBus) {
      throw new Error("Message bus has not been started yet");
    }

    if (this.client) {
      return;
    }

    this.client = new DashboardMessageBusClient({
      host: this.host,
      port: this.port
    });

    await this.client.ready();

    // the promise returned by `setupVerboseLogging` never resolves, so don't
    // bother awaiting it.
    this.setupVerboseLogging();
  }

  private async setupVerboseLogging(): Promise<void> {
    if (this.verbose && this.client) {
      this.client
        .subscribe({ type: logMessageType })
        .on("message", lifecycle => {
          if (lifecycle && lifecycle.message.type === "log") {
            const logMessage = lifecycle.message as LogMessage;
            const debug = debugModule(logMessage.payload.namespace);
            debug.enabled = true;
            debug(logMessage.payload.message);
          }
        });
    }
  }
}
