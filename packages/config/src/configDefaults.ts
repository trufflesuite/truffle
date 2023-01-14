import * as path from "path";
import Provider from "@truffle/provider";
import TruffleConfig from "./";

export const getInitialConfig = ({
  truffleDirectory,
  workingDirectory,
  network
}: {
  truffleDirectory?: string;
  workingDirectory?: string;
  network?: string;
}) => {
  const truffle_directory =
    truffleDirectory || path.resolve(path.join(__dirname, "../"));
  const working_directory = workingDirectory || process.cwd();

  return {
    truffle_directory,
    working_directory,
    network,
    networks: {
      dashboard: {
        network_id: "*",
        networkCheckTimeout: 120000,
        url: "http://localhost:24012/rpc",
        skipDryRun: true
      }
    },
    verboseRpc: false,
    solidityLog: {
      displayPrefix: "",
      preventConsoleLogMigration: false
    },
    debugGlobal: "debug",
    gas: null,
    gasPrice: null,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    type: undefined, //don't use null here!
    from: null,
    confirmations: 0,
    timeoutBlocks: 0,
    production: false,
    skipDryRun: false,
    build: null,
    resolver: null,
    artifactor: null,
    quiet: false,
    dashboard: {
      host: "localhost",
      port: 24012,
      verbose: false
    },
    ens: {
      enabled: false,
      registryAddress: null
    },
    mocha: {
      bail: false,
      grep: null
    },
    compilers: {
      solc: {
        settings: {
          //Note: The default solc version is *not* set here!
          //It's set in compilerSupplier/index.js in compile-solidity
          optimizer: {
            enabled: false,
            runs: 200
          },
          remappings: []
        }
      },
      vyper: {
        settings: {}
      }
    },
    console: {
      require: null
    },
    logger: console
  };
};

export const configProps = ({
  configObject
}: {
  configObject: TruffleConfig;
}) => {
  const resolveDirectory = (value: string): string =>
    path.resolve(configObject.working_directory, value);

  return {
    // These are already set.
    truffle_directory() {},
    working_directory() {},
    network() {},
    networks() {},
    verboseRpc() {},
    solidityLog() {},
    build() {},
    resolver() {},
    artifactor() {},
    dashboard() {},
    logger() {},
    compilers() {},
    ens() {},
    console() {},
    mocha() {},
    quiet() {},
    debugGlobal() {},

    build_directory: {
      default: () => path.join(configObject.working_directory, "build"),
      transform: resolveDirectory
    },
    contracts_directory: {
      default: () => path.join(configObject.working_directory, "contracts"),
      transform: resolveDirectory
    },
    contracts_build_directory: {
      default: () => path.join(configObject.build_directory, "contracts"),
      transform: resolveDirectory
    },
    migrations_directory: {
      default: () => path.join(configObject.working_directory, "migrations"),
      transform: resolveDirectory
    },
    migrations_file_extension_regexp() {
      return /^\.(js|ts|es6?)$/;
    },
    test_directory: {
      default: () => path.join(configObject.working_directory, "test"),
      transform: resolveDirectory
    },
    test_file_extension_regexp() {
      return /.*\.(js|ts|es|es6|jsx|sol)$/;
    },
    example_project_directory: {
      default: () => path.join(configObject.truffle_directory, "example"),
      transform: resolveDirectory
    },
    network_id: {
      get() {
        try {
          return configObject.network_config.network_id;
        } catch (e) {
          return null;
        }
      },
      set() {
        throw new Error(
          "Do not set config.network_id. Instead, set config.networks and then config.networks[<network name>].network_id"
        );
      }
    },
    network_config: {
      get() {
        const network = configObject.network;

        if (network === null || network === undefined) {
          throw new Error("Network not set. Cannot determine network to use.");
        }

        let config = configObject.networks[network];

        if (config === null || config === undefined) {
          config = {};
        }

        if (network === "dashboard") {
          const { host: configuredHost, port } = configObject.dashboard;
          const host =
            configuredHost === "0.0.0.0" ? "localhost" : configuredHost;

          const userOverrides = config;

          config = {
            network_id: "*",
            networkCheckTimeout: 120000,
            ...userOverrides,
            url: `http://${host}:${port}/rpc`,
            skipDryRun: true
          };
        }

        return config;
      },
      set() {
        throw new Error(
          "Don't set config.network_config. Instead, set config.networks with the desired values."
        );
      }
    },
    from: {
      get() {
        try {
          return configObject.network_config.from;
        } catch (e) {
          return null;
        }
      },
      set() {
        throw new Error(
          "Don't set config.from directly. Instead, set config.networks and then config.networks[<network name>].from"
        );
      }
    },
    gas: {
      get() {
        try {
          return configObject.network_config.gas;
        } catch (e) {
          return null;
        }
      },
      set() {
        throw new Error(
          "Don't set config.gas directly. Instead, set config.networks and then config.networks[<network name>].gas"
        );
      }
    },
    gasPrice: {
      get() {
        try {
          return configObject.network_config.gasPrice;
        } catch (e) {
          return null;
        }
      },
      set() {
        throw new Error(
          "Don't set config.gasPrice directly. Instead, set config.networks and then config.networks[<network name>].gasPrice"
        );
      }
    },
    maxFeePerGas: {
      get() {
        try {
          return configObject.network_config.maxFeePerGas;
        } catch (e) {
          return null;
        }
      },
      set() {
        throw new Error(
          "Don't set config.maxFeePerGas directly. Instead, set config.networks and then config.networks[<network name>].maxFeePerGas"
        );
      }
    },
    maxPriorityFeePerGas: {
      get() {
        try {
          return configObject.network_config.maxPriorityFeePerGas;
        } catch (e) {
          return null;
        }
      },
      set() {
        throw new Error(
          "Don't set config.maxPriorityFeePerGas directly. Instead, set config.networks and then config.networks[<network name>].maxPriorityFeePerGas"
        );
      }
    },
    type: {
      get() {
        try {
          return configObject.network_config.type;
        } catch (e) {
          return null;
        }
      },
      set() {
        throw new Error(
          "Don't set config.type directly. Instead, set config.networks and then config.networks[<network name>].type"
        );
      }
    },
    provider: {
      get() {
        if (!configObject.network) {
          return null;
        }

        const options = configObject.network_config;
        options.verboseRpc = configObject.verboseRpc;
        options.events = configObject.events;

        return Provider.create(options);
      },
      set() {
        throw new Error(
          "Don't set config.provider directly. Instead, set config.networks and then set config.networks[<network name>].provider"
        );
      }
    },
    confirmations: {
      get() {
        try {
          return configObject.network_config.confirmations;
        } catch (e) {
          return 0;
        }
      },
      set() {
        throw new Error(
          "Don't set config.confirmations directly. Instead, set config.networks and then config.networks[<network name>].confirmations"
        );
      }
    },
    production: {
      get() {
        try {
          return configObject.network_config.production;
        } catch (e) {
          return false;
        }
      },
      set() {
        throw new Error(
          "Don't set config.production directly. Instead, set config.networks and then config.networks[<network name>].production"
        );
      }
    },
    timeoutBlocks: {
      get() {
        try {
          return configObject.network_config.timeoutBlocks;
        } catch (e) {
          return 0;
        }
      },
      set() {
        throw new Error(
          "Don't set config.timeoutBlocks directly. Instead, set config.networks and then config.networks[<network name>].timeoutBlocks"
        );
      }
    }
  };
};
