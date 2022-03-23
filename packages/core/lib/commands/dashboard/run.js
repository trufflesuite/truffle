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

  const dashboardServerOptions = { port, host, verbose, publicChains };
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
