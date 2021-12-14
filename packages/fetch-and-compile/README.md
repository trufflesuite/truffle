# `@truffle/fetch-and-compile`

This is used to obtain external verified sourced and compile them.

### Usage

```ts
import * as dotenv from "dotenv";
dotenv.config();

import * as Codec from "@truffle/codec";
import Config from "@truffle/config";
//  🔨 set up by importing the fetch-and-compile.
import { fetchAndCompile } from "@truffle/fetch-and-compile";
import * as Decoder from "@truffle/decoder";

const config = Config.default().merge({
  networks: {
    mainnet: {
      url: process.env.RPC_URL,
      network_id: 1
    }
  },
  network: "mainnet",
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  }
});

async function decode(address: string) {
  // 👇 Pass in contract address and the network config to the fetchAndCompile 👇.
  const { compileResult } = await fetchAndCompile(address, config);

  // 🪄 Now we have the result from fetch-and-compile, we can use it with @truffle/decoder for some more magic ✨.
  const projectInfo = {
    commonCompilations: compileResult.compilations
  };
  const projectDecoder = await Decoder.forProject({
    provider: config.provider,
    projectInfo
  });
  const decoder = await projectDecoder.forAddress(address);
  const decoding = await decoder.decodeTransaction({
    to: "0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e",
    blockNumber: 13336592,
    from: "0xbc1be5ac62ca0637676f2b592bcd0a29bbf4e427",
    input:
      "0x1896f70af96f66c6c5e18dc3da0e5d238ee5ff0f56ad7876717492cfcbb3421db607e44c0000000000000000000000004976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41"
  });
  if (decoding.kind !== "function") {
    throw new Error("Unsupported decoding kind");
  }
  console.log("%s(", decoding.abi.name);
  console.group();
  for (const { name, value: result } of decoding.arguments) {
    console.log(
      `${name}:`,
      new Codec.Format.Utils.Inspect.ResultInspector(result)
    );
  }
  console.groupEnd();
  console.log(")");
}
// 🥳 Try it out with a contract.
decode("0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e");
```

Please see the [README for @truffle/decoder](https://github.com/trufflesuite/truffle/tree/develop/packages/decoder)
for more information on using Truffle decoder.
