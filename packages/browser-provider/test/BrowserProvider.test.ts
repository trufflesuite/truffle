import { promisify } from "util";
import { BrowserProvider } from "../lib";

jest.setTimeout(200000);

describe("BrowserProvider", () => {
  let provider: BrowserProvider;

  beforeAll(() => {
    provider = new BrowserProvider();
  });

  afterAll(() => {
    provider.terminate();
  });

  it("should propagate a message to MetaMask", async () => {
    const send = promisify(provider.send.bind(provider));
    // const result = await send({ jsonrpc: '2.0', params: [], method: 'web3_clientVersion', id: 1 });

    const msgParams = [
      {
        type: 'string',      // Any valid solidity type
        name: 'Message',     // Any string label you want
        value: 'Hi, Alice!'  // The value to sign
     },
     {
       type: 'uint32',
          name: 'A number',
          value: '1337'
      }
    ];

    const result = await send({
      jsonrpc: "2.0",
      method: "eth_signTypedData",
      params: [msgParams, "0xe126b3E5d052f1F575828f61fEBA4f4f2603652a"],
      id: 1
    });

    console.log(result);
  });
});
