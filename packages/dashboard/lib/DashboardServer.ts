import express, { Application, NextFunction, Request, Response } from "express";
import path from "path";
import getPort from "get-port";
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
import debugModule from "debug";

export interface DashboardServerOptions {
  /** Port of the dashboard */
  port: number;

  /** Port of the message bus publish socket server */
  publishPort?: number;

  /** Port of the message bus subscribe socket server */
  subscribePort?: number;

  /** Host of the dashboard (default: localhost) */
  host?: string;

  /** Boolean indicating whether the POST /rpc endpoint should be exposed (default: true) */
  rpc?: boolean;

  /** Boolean indicating whether debug output should be logged (default: false) */
  verbose?: boolean;

  /** Boolean indicating whether whether starting the DashboardServer should automatically open the dashboard (default: true) */
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
  private httpServer?: Server;
  private messageBus?: DashboardMessageBus;
  private client?: DashboardMessageBusClient;
  private configPublishPort?: number;
  private configSubscribePort?: number;

  boundTerminateListener: () => void;

  get subscribePort(): number | undefined {
    return this.messageBus?.subscribePort;
  }

  get publishPort(): number | undefined {
    return this.messageBus?.subscribePort;
  }

  constructor(options: DashboardServerOptions) {
    this.host = options.host ?? "localhost";
    this.port = options.port;
    this.configPublishPort = options.publishPort;
    this.configSubscribePort = options.subscribePort;
    this.rpc = options.rpc ?? true;
    this.verbose = options.verbose ?? false;
    this.autoOpen = options.autoOpen ?? true;
    this.frontendPath = path.join(
      __dirname,
      ".",
      "dashboard-frontend",
      "build"
    );

    this.boundTerminateListener = () => this.stop();
  }

  async start() {
    if (this.httpServer?.listening) {
      return;
    }

    this.messageBus = await this.startMessageBus();

    this.expressApp = express();

    this.expressApp.use(cors());
    this.expressApp.use(express.json());
    this.expressApp.use(express.static(this.frontendPath));

    this.expressApp.get("/ports", this.getPorts.bind(this));

    if (this.rpc) {
      await this.connectToMessageBus();
      this.expressApp.post("/rpc", this.postRpc.bind(this));
    }

    await new Promise<void>(resolve => {
      this.httpServer = this.expressApp!.listen(this.port, this.host, () => {
        if (this.autoOpen) {
          const host = this.host === "0.0.0.0" ? "localhost" : this.host;
          open(`http://${host}:${this.port}`);
        }
        resolve();
      });
    });
  }

  async stop() {
    this.messageBus?.off("terminate", this.boundTerminateListener);

    await Promise.all([
      this.client?.close(),
      this.messageBus?.terminate(),
      new Promise<void>(resolve => {
        this.httpServer?.close(() => resolve());
      })
    ]);
    delete this.client;
  }

  private getPorts(req: Request, res: Response) {
    if (!this.messageBus) {
      throw new Error("Message bus has not been started yet");
    }

    res.json({
      dashboardPort: this.port,
      subscribePort: this.messageBus.subscribePort,
      publishPort: this.messageBus.publishPort
    });
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
    const subscribePort =
      this.configSubscribePort ?? (await getPort({ host: this.host }));
    const publishPort =
      this.configPublishPort ?? (await getPort({ host: this.host }));

    const messageBus = new DashboardMessageBus(
      publishPort,
      subscribePort,
      this.host
    );

    await messageBus.start();
    messageBus.on("terminate", this.boundTerminateListener);

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
      subscribePort: this.messageBus.subscribePort,
      publishPort: this.messageBus.publishPort
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
