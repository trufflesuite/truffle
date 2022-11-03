const debug = require("debug")("provider");
const Web3 = require("web3");
const { createInterfaceAdapter } = require("@truffle/interface-adapter");
const wrapper = require("./wrapper");
const DEFAULT_NETWORK_CHECK_TIMEOUT = 5000;

let id = 0;

module.exports = {
  wrap: function (provider, options) {
    return wrapper.wrap(provider, options);
  },

  create: function (options) {
    const provider = this.getProvider(options);
    return this.wrap(provider, options);
  },

  getProvider: function (options) {
    let provider;
    if (options.provider && typeof options.provider === "function") {
      provider = options.provider();
    } else if (options.provider) {
      provider = options.provider;
    } else if (options.websockets || /^wss?:\/\//.test(options.url)) {
      provider = new Web3.providers.WebsocketProvider(
        options.url || "ws://" + options.host + ":" + options.port
      );
    } else {
      provider = new Web3.providers.HttpProvider(
        options.url || `http://${options.host}:${options.port}`,
        { keepAlive: false }
      );
    }
    if (
      typeof provider.request === "undefined" &&
      typeof provider.send !== "undefined"
    ) {
      provider.request = async function ({ method, params }) {
        return await new Promise((accept, reject) => {
          provider.send(
            {
              jsonrpc: "2.0",
              id: ++id,
              method,
              params
            },
            (error, response) => {
              if (error) {
                return reject(error);
              }
              if (response.error) {
                const error = new Error(response.error.message);
                error.code = response.error.code;
                if ("data" in error) {
                  error.data = response.error.data;
                }
                return reject(error);
              }
              const { result: res } = response;
              accept(res);
            }
          );
        });
      };
    }
    provider.request && (provider.request = provider.request.bind(provider));
    return provider;
  },

  testConnection: function (options) {
    let networkCheckTimeout, networkType;
    const { networks, network } = options;
    if (networks && networks[network]) {
      networkCheckTimeout =
        networks[network].networkCheckTimeout || DEFAULT_NETWORK_CHECK_TIMEOUT;
      networkType = networks[network].type;
    } else {
      networkCheckTimeout = DEFAULT_NETWORK_CHECK_TIMEOUT;
    }
    const provider = this.getProvider(options);
    const { host } = provider;
    const interfaceAdapter = createInterfaceAdapter({ provider, networkType });
    return new Promise((resolve, reject) => {
      const noResponseFromNetworkCall = setTimeout(() => {
        let errorMessage =
          "There was a timeout while attempting to connect to the network at " +
          host +
          ".\n       Check to see that your provider is valid." +
          "\n       If you have a slow internet connection, try configuring a longer " +
          "timeout in your Truffle config. Use the " +
          "networks[networkName].networkCheckTimeout property to do this.";

        if (network === "dashboard") {
          errorMessage +=
            "\n       Also make sure that your Truffle Dashboard browser " +
            "tab is open and connected to MetaMask.";
        }

        throw new Error(errorMessage);
      }, networkCheckTimeout);

      let networkCheckDelay = 1;
      (function networkCheck() {
        setTimeout(async () => {
          try {
            await interfaceAdapter.getBlockNumber();
            clearTimeout(noResponseFromNetworkCall);
            clearTimeout(networkCheck);
            return resolve(true);
          } catch (error) {
            console.log(
              "> Something went wrong while attempting to connect to the " +
                "network at " +
                host +
                ". Check your network configuration."
            );
            clearTimeout(noResponseFromNetworkCall);
            clearTimeout(networkCheck);
            return reject(error);
          }
          networkCheckDelay *= 2;
          networkCheck();
        }, networkCheckDelay);
      })();
    });
  }
};
