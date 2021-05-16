import WebSocket from "ws";
import { base64ToJson, connectToWebServerWithRetries, jsonToBase64 } from "./utils";

export class Frontend {
  private socket: WebSocket;

  constructor(private port = 8081) {}

  // On the webpage display nice info using truffle decoder
  // Click some button to prompt the metamask sending

  public async start() {
    await this.ready();

    this.socket.on("message", (data: WebSocket.Data) => {
      if (typeof data !== "string") return;
      const request = base64ToJson(data);

      console.log(request);

      const response = {
        id: request.id,
        payload: {
          jsonrpc: "2.0",
          id: 1,
          result: 1,
        }
      };

      const encodedResponse = jsonToBase64(response);

      this.socket.send(encodedResponse);
    });
  }

  private async ready() {
    if (this.socket && this.socket.OPEN) return;
    this.socket = await connectToWebServerWithRetries(this.port);
  }
}

const frontend = new Frontend(8081);
frontend.start();
