import { DashboardServer } from "../lib/DashboardServer";

const options = {
  port: 24012,
  host: "localhost",
  verbose: true,
  rpc: true,
  autoOpen: false,
  publicChains: [
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
    },
    {
      chainId: "0x38",
      chainName: "Binance Smart Chain Mainnet",
      nativeCurrency: {
        symbol: "BNB",
        decimals: 18
      },
      rpcUrls: ["https://bsc-dataseed.binance.org/"],
      blockExplorerUrls: ["https://bscscan.com"]
    }
  ]
};

const dashboardServer = new DashboardServer(options);
dashboardServer.start();
