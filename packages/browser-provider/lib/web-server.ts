import { ChildProcess } from "child_process";
import WebSocket from "ws";
import { base64ToJson, jsonToBase64, sendAndAwait, startFrontend } from "./utils";
import delay from "delay";

class Server {
  providerServer: WebSocket.Server;
  connectedProviderCount = 0;

  frontendServer: WebSocket.Server;
  frontendSocket: WebSocket;
  frontendProcess: ChildProcess;

  start(providerPort: number, frontendPort: number) {
    // Make sure that the frontend process gets killed whenever the web server gets killed
    process.on("SIGINT", this.terminate.bind(this));
    process.on("SIGTERM", this.terminate.bind(this));
    process.on("uncaughtException", this.terminate.bind(this));

    this.frontendProcess = startFrontend();

    this.frontendServer = new WebSocket.Server({ host: '0.0.0.0', port: frontendPort });
    this.frontendServer.on("connection", (socket: WebSocket) => {
      this.frontendSocket = socket;

      // TODO: Do we want to terminate the web server when the browser tab closes
      // or do we allow the user to close and re-open again?
      socket.on("close", () => {
        this.terminate(1);
      });
    });

    this.providerServer = new WebSocket.Server({ host: '0.0.0.0', port: providerPort });
    this.providerServer.on("connection", (socket: WebSocket) => {
      this.connectedProviderCount++;

      socket.on("message", (data: WebSocket.Data) => {
        this.processRequest(socket, data);
      });

      socket.on("close", () => {
        if (--this.connectedProviderCount <= 0) {
          this.terminate();
        }
      });
    });
  }

  // Make sure that the frontend process is killed whenever the web server is killed
  terminate(code = 0) {
    this.frontendProcess?.kill();
    process.exit(code);
  }

  // Wait until the frontend process is started and the websockets connection is established
  async ready() {
    if (this.frontendSocket) return;
    await delay(1000);
    await this.ready();
  }

  async processRequest(socket: WebSocket, data: WebSocket.Data) {
    await this.ready();

    if (typeof data !== "string") return;
    const decodedData = base64ToJson(data);

    const responsePayload = await sendAndAwait(this.frontendSocket, decodedData.payload);

    const response = {
      id: decodedData.id,
      payload: responsePayload
    };

    const encodedResponse = jsonToBase64(response);

    socket.send(encodedResponse);
  }
}

const server = new Server();
server.start(8080, 8081);
