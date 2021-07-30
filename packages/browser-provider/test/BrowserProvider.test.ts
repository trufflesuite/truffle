import { promisify } from "util";
import { BrowserProvider } from "../lib";

jest.setTimeout(200000);

// TODO: Create a mock dashboard that replies to requests with mock data
// so that we can properly test this, and then properly test this
// TODO: Perhaps also add some tests where we're using this provider inside Ethers.js / web3.js
describe.skip("BrowserProvider", () => {
  let provider: BrowserProvider;

  beforeAll(() => {
    provider = new BrowserProvider();
  });

  it("should propagate a message to MetaMask", async () => {
    const send = promisify(provider.send.bind(provider));

    const accounts = await send({
      jsonrpc: "2.0",
      method: "eth_accounts",
      params: [],
      id: 1
    });

    console.log("eth_accounts");
    console.log(accounts);

    const [address] = accounts?.result;

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
      params: [msgParams, address],
      id: 1
    });

    console.log("eth_signTypedData");
    console.log(result);
  });
});
