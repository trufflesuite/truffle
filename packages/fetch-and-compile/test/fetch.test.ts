import assert from "assert";
import { describe, it } from "mocha";
import Config from "@truffle/config";
import { fetchAndCompile } from "../lib/index";
  describe("HD Wallet Provider Validator", () => {
    const config = Config.default().merge({
        networks: {
          mainnet: {
            url: 'https://mainnet.infura.io/v3/a6f6223b17034a66a6d9289a6e80d77c',
            network_id: 1
          }
        },
      ​
        network: "mainnet",
      ​
        // etherscan: {
        //   apiKey: process.env.ETHERSCAN_KEY
        // }
      });
    let result = await fetchAndCompile('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',config)
    console.log(result);
    });

//   describe("fetchAndCompile, () => {
//     it("fails missing protocol", () => {
//       const config = Config.default().merge({
//           networks: {
//             mainnet: {
//               url: process.env.RPC_URL,
//               network_id: 1
//             }
//           },
//         ​
//           network: "mainnet",
//         ​
//           etherscan: {
//             apiKey: process.env.ETHERSCAN_KEY
//           }
//         });
//         ​
//       fetchAndCompile('contract',config)
//     });