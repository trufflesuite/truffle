import * as t from "io-ts";

import * as EnvironmentNetworks from "@truffle/config-new/environmentNetworks";

/*
 * Define Ethereum-aware configuration
 */
namespace Ethereum {
  export const network = t.type({
    jsonrpcUrl: t.string,
    networkId: t.number
  });

  export const config = EnvironmentNetworks.config({
    networkKind: "ethereum",
    network,
    fieldName: "contracts"
  });
}

/*
 * Define IPFS-aware configuration
 */
namespace Ipfs {
  export const network = t.type({
    url: t.string,
  });

  export const config = EnvironmentNetworks.config({
    networkKind: "ipfs",
    network,
    fieldName: "storage"
  });
}

/*
 * Define dual-schema config
 */
namespace EthereumAndIpfs {
  export const config = t.intersection([
    Ethereum.config,
    Ipfs.config
  ]);
}

describe("Network configuration", () => {
  it("decodes blank config", () => {
    const config = {};

    expect(config).toBeValid(Ethereum.config);
  });

  it("fails to decode config with invalid network", () => {
    const config = {
      networks: {
        ethereum: {
          mainnet: {}
        }
      }
    };

    expect(config).not.toBeValid(Ethereum.config);
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

    expect(config).toBeValid(Ethereum.config);
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
          storage: {
            network: { name: "primary" }
          },

          contracts: {
            network: { name: "mainnet" }
          }
        }
      }
    };

    expect(config).toBeValid(EthereumAndIpfs.config);
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

    expect(config).not.toBeValid(Ethereum.config);
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
          storage: {
            network: { name: "mainnet" }
          },

          contracts: {
            network: { name: "mainnet" }
          }
        }
      }
    };

    expect(config).toBeValid(Ethereum.config);
    expect(config).not.toBeValid(Ipfs.config);
    expect(config).not.toBeValid(EthereumAndIpfs.config);
  });
});
