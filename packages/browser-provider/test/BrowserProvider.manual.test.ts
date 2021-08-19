import { promisify } from "util";
import { BrowserProvider } from "../lib";

jest.setTimeout(200000);

// TODO: Create a mock dashboard that replies to requests with mock data
// so that we can properly test this, and then properly test this
// TODO: Perhaps also add some tests where we're using this provider inside Ethers.js / web3.js
describe.skip("BrowserProvider", () => {
  let provider: BrowserProvider;
  let address: string;

  beforeAll(async () => {
    provider = new BrowserProvider();
    const send = promisify(provider.send.bind(provider));

    const accounts = await send({
      jsonrpc: "2.0",
      method: "eth_accounts",
      params: [],
      id: 1
    });

    console.log("eth_accounts");
    console.log(accounts);

    address = accounts?.result[0];
  });

  it("should propagate eth_sendTransaction to MetaMask", async () => {
    const send = promisify(provider.send.bind(provider));

    const transaction = {
      from: address,
      to: address,
      value: '16345785D8A0000', // 0.1 ETH
    };

    const result = await send({
      jsonrpc: "2.0",
      method: "eth_sendTransaction",
      params: [transaction],
      id: 1
    });

    console.log("eth_sendTransaction");
    console.log(result);
  });

  // it("should propagate eth_sign to MetaMask", async () => {
  //   const send = promisify(provider.send.bind(provider));

  //   const result = await send({
  //     jsonrpc: "2.0",
  //     method: "eth_sign",
  //     params: [address, '0xc0ffee'],
  //     id: 1
  //   });

  //   console.log("eth_sign");
  //   console.log(result);
  // });

  it("should propagate eth_signTypedData to MetaMask", async () => {
    const send = promisify(provider.send.bind(provider));

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

  it("should propagate eth_signTypedData_v4 to MetaMask", async () => {
    const send = promisify(provider.send.bind(provider));

    const chainIdResult = await send({
      jsonrpc: "2.0",
      method: "net_version",
      params: [],
      id: 1
    });

    const chainId = chainIdResult?.result ?? 1;

    // Code taken from https://docs.metamask.io/guide/signing-data.html#sign-typed-data-v4

    const msgParams = JSON.stringify({
      domain: {
        // Defining the chain aka Rinkeby testnet or Ethereum Main Net
        chainId,
        // Give a user friendly name to the specific contract you are signing for.
        name: 'Ether Mail',
        // If name isn't enough add verifying contract to make sure you are establishing contracts with the proper entity
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        // Just let's you know the latest version. Definitely make sure the field name is correct.
        version: '1',
      },

      // Defining the message signing data content.
      message: {
        /*
         - Anything you want. Just a JSON Blob that encodes the data you want to send
         - No required fields
         - This is DApp Specific
         - Be as explicit as possible when building out the message schema.
        */
        contents: 'Hello, Bob!',
        attachedMoneyInEth: 4.2,
        from: {
          name: 'Cow',
          wallets: [
            '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
            '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
          ],
        },
        to: [
          {
            name: 'Bob',
            wallets: [
              '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
              '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
              '0xB0B0b0b0b0b0B000000000000000000000000000',
            ],
          },
        ],
      },
      // Refers to the keys of the *types* object below.
      primaryType: 'Mail',
      types: {
        // TODO: Clarify if EIP712Domain refers to the domain the contract is hosted on
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        // Not an EIP712Domain definition
        Group: [
          { name: 'name', type: 'string' },
          { name: 'members', type: 'Person[]' },
        ],
        // Refer to PrimaryType
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person[]' },
          { name: 'contents', type: 'string' },
        ],
        // Not an EIP712Domain definition
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallets', type: 'address[]' },
        ],
      },
    });

    const result = await send({
      jsonrpc: "2.0",
      method: "eth_signTypedData_v4",
      params: [address, msgParams],
      id: 1
    });

    console.log("eth_signTypedData_v4");
    console.log(result);
  });
});
