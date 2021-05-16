import WebSocket from "ws";
import { base64ToJson, jsonToBase64 } from "./utils";
import { MessageType } from "./types";

class Server {
  wss: WebSocket.Server;
  connections = 0;

  start(port: number) {
    this.wss = new WebSocket.Server({ port });

    this.wss.on("connection", (socket: WebSocket) => {
      this.connections++;

      socket.on("message", (data: WebSocket.Data) => {
        if (typeof data !== "string") return;
        const jsonMessage = base64ToJson(data);

        if (jsonMessage.type === MessageType.REQUEST) {
          this.processRequest(socket, jsonMessage);
        }
      });

      socket.on("close", () => {
        if (--this.connections <= 0) {
          process.exit(0);
        }
      });
    });
  }

  async processRequest(socket: WebSocket, request: any) {
    const response = {
      type: MessageType.RESPONSE,
      id: request.id,
      payload: {
        jsonrpc: "2.0",
        id: 1,
        result: 1,
      }
    };

    const encodedResponse = jsonToBase64(response);

    socket.send(encodedResponse);
  }
}

const server = new Server();
server.start(8080);
