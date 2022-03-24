module.exports = async function (options) {
  const { detectConfigOrDefault } = require("../../utils/utils");
  const { DashboardServer } = require("@truffle/dashboard");
  const address = require("address");

  const config = detectConfigOrDefault(options);

  const port = options.port || config.dashboard.port;
  const host = options.host || config.dashboard.host;
  const verbose = options.verbose || config.dashboard.verbose;
  const publicChains = [
    {
      chainId: "0x1",
      chainName: "mainnet",
      nativeCurrency: {
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: ["https://mainnet.infura.io/v3/"],
      blockExplorerUrls: ["https://etherscan.com"]
    },
    {
      chainId: "0x3",
      chainName: "ropsten",
      nativeCurrency: {
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: ["https://ropsten.infura.io/v3/"],
      blockExplorerUrls: ["https://ropsten.etherscan.com"]
    },
    {
      chainId: "0x4",
      chainName: "rinkeby",
      nativeCurrency: {
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: ["https://rinkeby.infura.io/v3/"],
      blockExplorerUrls: ["https://rinkeby.etherscan.com"]
    },
    {
      chainId: "0x2A",
      chainName: "kovan",
      nativeCurrency: {
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: ["https://ropsten.infura.io/v3/"],
      blockExplorerUrls: ["https://kovan.etherscan.com"]
    },
    {
      chainId: "0x5",
      chainName: "goerli",
      nativeCurrency: {
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: ["https://goerli.infura.io/v3/"],
      blockExplorerUrls: ["https://goerli.etherscan.com"]
    }
  ];

  const mainnet = publicChains[0];
  const mergedChains = [...publicChains];
  if (config.networks) {
    const chainNames = Object.keys(config.networks);

    // filters out all truffle-config chains that wouldn't make valid dashboard
    // networks. for the rest, it assembles the relevant data and fills in
    // mainnet data where needed to make a `dashboardChain`
    const configuredNetworks = chainNames.reduce((filtered, chainName) => {
      const chain = config.networks[chainName];
      if (
        chainName !== "dashboard" &&
        chainName !== "test" &&
        chainName !== "develop" &&
        ((chain.host && chain.port) || // either has a host/port
          (chain.rpcUrls && chain.rpcUrls.length > 0)) // or they provided an rpc url
      ) {
        // if they didn't provide an rpc url and thus are using local host,
        // assume this is their own local instance of a chain
        const isLocalChain = !chain.rpcUrls || chain.rpcUrls.length === 0;
        filtered.push({
          chainId: chain.chainId ? chain.chainId : undefined,
          chainName: chainName,
          nativeCurrency: chain.nativeCurrency
            ? chain.nativeCurrency
            : mainnet.nativeCurrency,
          rpcUrls: chain.rpcUrls
            ? chain.rpcUrls
            : [`http://${chain.host}:${chain.port}`],
          blockExplorerUrls: chain.blockExplorerUrls
            ? chain.blockExplorerUrls
            : undefined,
          isLocalChain
        });
      }
      return filtered;
    }, []);

    mergedChains.push(...configuredNetworks);
    console.log(mergedChains);
  }

  const dashboardServerOptions = {
    port,
    host,
    verbose,
    dashboardChains: mergedChains
  };
  const dashboardServer = new DashboardServer(dashboardServerOptions);
  await dashboardServer.start();

  if (host === "0.0.0.0") {
    // Regex taken from react-scripts to check that the address is a private IP, otherwise we discard it
    // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
    let lanAddress =
      /^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(address.ip())
        ? address.ip()
        : undefined;

    console.log(`Truffle Dashboard running at http://localhost:${port}`);
    lanAddress &&
      console.log(`                             http://${lanAddress}:${port}`);

    console.log(
      `DashboardProvider RPC endpoint running at http://localhost:${port}/rpc`
    );
    lanAddress &&
      console.log(
        `                                          http://${lanAddress}:${port}/rpc`
      );
  } else {
    console.log(`Truffle Dashboard running at http://${host}:${port}`);
    console.log(
      `DashboardProvider RPC endpoint running at http://${host}:${port}/rpc`
    );
  }

  // ensure that `await`-ing this method never resolves. (we want to keep
  // the console open until it exits on its own)
  return new Promise(() => {});
};
