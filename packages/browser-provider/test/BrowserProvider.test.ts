import { promisify } from "util";
import { BrowserProvider } from "../lib";

jest.setTimeout(20000);

describe("BrowserProvider", () => {
  it("should start", async () => {
    const provider = new BrowserProvider();
    const result = await promisify(provider.send.bind(provider))({ jsonrpc: '2.0', params: [], method: 'hello', id: 1 });

    console.log(result);
  });
});
