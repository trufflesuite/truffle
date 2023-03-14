import assert from "assert";
import http, { Server, ServerResponse } from "http";
import { StreamingWeb3HttpProvider } from "../lib/";

describe("test", () => {
  const PORT = 9451;
  let server: Server;
  const SIZE = (1000000000 / 2) | 0;
  beforeEach(() => {
    server = http.createServer();
    server
      .on("request", (request, response: ServerResponse) => {
        let body: Buffer[] = [];
        request
          .on("data", (chunk: Buffer) => {
            body.push(chunk);
          })
          .on("end", () => {
            response.writeHead(200, "OK", {
              "content-type": "application/json"
            });
            const prefix = '{"id":1,"result":{"structLogs":["';
            const postfix = '"]}}';
            response.write(prefix);
            // .5 gigs of utf-8 0s
            const lots = Buffer.allocUnsafe(SIZE).fill(48);
            response.write(lots);
            response.write('","');
            response.write(lots);
            response.write('","');
            response.write(lots);
            response.write('","');
            response.write(lots);
            response.write(postfix);
            response.end();
          });
      })
      .listen(PORT);
  });
  afterEach(async () => {
    server && server.close();
  });
  it("handles giant traces", async function () {
    this.timeout(0);
    const provider = new StreamingWeb3HttpProvider(`http://localhost:${PORT}`);
    const { result } = await new Promise<any>((resolve, reject) => {
      provider.send(
        {
          id: 1,
          jsonrpc: "2.0",
          method: "debug_traceTransaction",
          params: ["0x1234"]
        },
        (err, result) => {
          if (err) return void reject(err);
          resolve(result);
        }
      );
    });
    assert.strictEqual(result.structLogs.length, 4);
    result.structLogs.forEach((log: Buffer) => {
      assert.strictEqual(log.length, SIZE);
    });
  });
});
