import WebSocket from "ws";
import { base64ToJson, jsonToBase64, sendAndAwait } from "./utils";

class Server {
  providerServer: WebSocket.Server;
  frontendServer: WebSocket.Server;
  frontendSocket: WebSocket;
  connections = 0;

  start(port: number, frontendPort: number) {
    this.providerServer = new WebSocket.Server({ port });
    this.providerServer.on("connection", (socket: WebSocket) => {
      this.connections++;

      socket.on("message", (data: WebSocket.Data) => {
        this.processRequest(socket, data);
      });

      socket.on("close", () => {
        if (--this.connections <= 0) {
          process.exit(0);
        }
      });
    });

    this.frontendServer = new WebSocket.Server({ port: frontendPort });
    this.frontendServer.on("connection", (socket: WebSocket) => {
      this.frontendSocket = socket;

      socket.on("close", () => {
        process.exit(1);
      });
    });
  }

  async processRequest(socket: WebSocket, data: WebSocket.Data) {
    if (!this.frontendSocket) {
      socket.close(1, "No connection to frontend");
      return;
    }

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
