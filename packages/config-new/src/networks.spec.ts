// import * as t from "io-ts";
import { isRight } from "fp-ts/lib/Either";
import reporter from "io-ts-reporters";
// import { expectTypeOf } from "expect-type";

// import { DualConfig, IpfsNetwork, EthereumNetwork } from "test/networks";
import { ethereumConfig } from "test/networks";

describe("Network configuration", () => {
  it("decodes blank config", () => {
    const result = ethereumConfig.decode({
      networks: {
        ethereum: {}
      },
      environments: {}
    });

    expect(isRight(result)).toBe(true);
  });

  it("fails to decode config with invalid network", () => {
    const result = ethereumConfig.decode({
      networks: {
        ethereum: {
          mainnet: {}
        }
      }
    });

    console.log(reporter.report(result));
    expect(isRight(result)).toBe(false);
  });

  it("fails to decode config with network mismatch", () => {
    const result = ethereumConfig.decode({
      networks: {
        ethereum: {
          mainnet: {
            jsonrpcUrl: "https://jsonrpc",
            networkId: 1
          }
        }
      },
      environments: {
        production: {
          ethereum: {
            network: { name: "rinkeby" }
          }
        }
      }
    });

    console.log(reporter.report(result));

    expect(isRight(result)).toBe(false);
  });
});
