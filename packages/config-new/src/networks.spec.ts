import * as t from "io-ts";
import { isRight } from "fp-ts/lib/Either";
import reporter from "io-ts-reporters";
import { expectTypeOf } from "expect-type";


// import { DualConfig, IpfsNetwork, EthereumNetwork } from "test/networks";
import { EthereumConfig, dualConfig, ethereumConfig, ipfsConfig } from "test/networks";

declare global {
  namespace jest {
    interface Matchers<R> { // eslint-disable-line @typescript-eslint/no-unused-vars
      toBeValid<T>(codec: t.Type<T>);
    }
  }
}
expect.extend({
  toBeValid<T>(item: unknown, codec: t.Type<T>) {
    const result = codec.decode(item);
    const pass = isRight(result);

    return {
      pass,
      message: pass
        ? () => [
            this.utils.matcherHint("toBeValid", undefined, undefined, this),
            "",
            `Expected ${
              this.utils.printExpected(codec)
            } not to successfully decode ${
              this.utils.printReceived(item)
            }`
          ].join("\n")
        : () => [
            this.utils.matcherHint("toBeValid"),
            "",
            "Errors:",
            ...reporter.report(result).map(error => ` - ${error}`),
            ""
          ].join("\n")
    };
  }
});

describe("Network configuration", () => {
  it("decodes blank config", () => {
    const config = {};

    expect(config).toBeValid(ethereumConfig);
  });

  it("fails to decode config with invalid network", () => {
    const config = {
      networks: {
        ethereum: {
          mainnet: {}
        }
      }
    };

    expect(config).not.toBeValid(ethereumConfig);
  });

  it("decodes valid input for a single codec", () => {
    const config = {
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
          contracts: {
            network: { name: "mainnet" }
          }
        }
      }
    };

    expect(config).toBeValid(ethereumConfig);
  });

  it("decodes valid input for multiple codecs", () => {
    const config = {
      networks: {
        ipfs: {
          primary: {
            url: "http://ipfs"
          }
        },

        ethereum: {
          mainnet: {
            jsonrpcUrl: "https://jsonrpc",
            networkId: 1
          }
        }
      },
      environments: {
        production: {
          ipfs: {
            network: { name: "primary" }
          },

          contracts: {
            network: { name: "mainnet" }
          }
        }
      }
    };

    expect(config).toBeValid(dualConfig);
  });

  it("fails to decode config with network mismatch", () => {
    const config = {
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
          contracts: {
            network: { name: "rinkeby" }
          }
        }
      }
    };

    expect(config).not.toBeValid(ethereumConfig);
  });

  it("fails to decode input when network references wrong network kind", () => {
    const config = {
      networks: {
        ipfs: {
          primary: {
            url: "http://ipfs"
          },
          secondary: {
            url: "http://other-ipfs"
          },
          tertiary: {
            url: "http://backup"
          }
        },

        ethereum: {
          mainnet: {
            jsonrpcUrl: "https://jsonrpc",
            networkId: 1
          },
          ganache: {
            jsonrpcUrl: "https://ganache",
            networkId: 1337
          }
        }
      },
      environments: {
        production: {
          ipfs: {
            network: { name: "mainnet" }
          },

          contracts: {
            network: { name: "mainnet" }
          }
        }
      }
    };

    expect(config).toBeValid(ethereumConfig);
    expect(config).not.toBeValid(ipfsConfig);
    expect(config).not.toBeValid(dualConfig);
  });
});
