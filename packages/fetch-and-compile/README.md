# `@truffle/fetch-and-compile`

This is used to obtain externally verified sources and compile them.

Note: If you import this into your TS project, you may need to enable `skipLibCheck` in your tsconfig due to an indirect dependency on @truffle/contract-schema.

## Usage

### `fetchAndCompile`

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
  // 👇 Pass in a contract address and a network config to fetchAndCompile 👇.
  const { compileResult } = await fetchAndCompile(address, config);

  // 🪄 Now that we have the result from fetch-and-compile, we can use it with @truffle/decoder for some more magic ✨.
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
// 🥳 Try it out with a contract - this is the address for the ENS registry
decode("0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e");
// --- yields the following output ---
// setResolver(
//   node: 0xf96f66c6c5e18dc3da0e5d238ee5ff0f56ad7876717492cfcbb3421db607e44c
//   resolver: 0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41
// )
```

### `fetchAndCompileMultiple`

If you want to fetch and compile multiple contracts from the same network, you can use `fetchAndCompileMultiple`:

```ts
import { fetchAndCompileMultiple } from "@truffle/fetch-and-compile";
const config = /* set up config */;
const addresses: string[] = /* set addresses */;
const { results, failures } = await fetchAndCompileMultiple(addresses, config);
for (const address in results) {
  const compileResult = results[address];
  /* do things with compileResult as above */
}
for (const address in failures) {
  /* do things with failed addresses */
}
```

### Alternate input format

Instead of using a Truffle Config as input, you can pass in a `FetchAndCompileOptions` anywhere that
a `config` is used above. The format is as follows:

```ts
export interface FetchAndCompileOptions {
  network: {
    networkId: number;
  };
  fetch?: {
    precedence?: string[]; //which fetchers to use and in what order; defaults
    //to ["etherscan", "sourcify", "blockscout"]
    fetcherOptions?: {
      etherscan?: {
        apiKey: string; //etherscan API key if you have one to speed things up
      };
      sourcify?: {
        //nothing to go here at present
      };
      blockscout?: {
        apiKey: string; //blockscout API key if you have one
      };
    };
  };
  compile?: {
    docker?: boolean; //indicates that compilation should use dockerized solc;
    //note this won't work with contracts compiled with prerelease versions
    //of Solidity
  };
}
```

### `getSupportedNetworks`

If you want a (potentially partial) list of supported networks, you can call `getSupportedNetworks`:

```ts
import { getSupportedNetworks } from "@truffle/fetch-and-compile";
const networks = getSupportedNetworks();
// networks = {
//   mainnet: {
//     name: "mainnet",
//     networkId: 1,
//     chainId: 1,
//     fetchers: ["etherscan", "sourcify"] //which fetchers support this network?
//   },
//   ...
// }
```

Note that there may be additional unlisted supported networks.

You can also pass in a list of fetchers if you want to restrict the output to the networks
supported by the fetchers you list. (You can also pass in a config and it will use the `sourceFetchers`
property if set, or a `FetchAndCompileOptions` and it will use the `fetch.precedence` field if set.)

```ts
import { getSupportedNetworks } from "@truffle/fetch-and-compile";
import Config from "@truffle/config";
const networks = getSupportedNetworks(["etherscan"]); //will only list those supported by etherscan fetcher
// networks = {
//   mainnet: {
//     name: "mainnet",
//     networkId: 1,
//     chainId: 1,
//     fetchers: ["etherscan"] //sourcify is not listed since it's not being checked
//   },
//   ...
// }
```

Please see the [README for @truffle/decoder](https://github.com/trufflesuite/truffle/tree/develop/packages/decoder)
for more information on using Truffle decoder.
