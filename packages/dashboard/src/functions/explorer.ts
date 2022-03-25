import { ChainId } from "src/constants/ChainId";

const explorers = {
  etherscan: (
    link: string,
    data: string,
    type: "transaction" | "token" | "address" | "block"
  ) => {
    switch (type) {
      case "transaction":
        return `${link}/tx/${data}`;
      default:
        return `${link}/${type}/${data}`;
    }
  }
};

interface ChainObject {
  [chainId: number]: {
    link: string;
    builder: (
      chainName: string,
      data: string,
      type: "transaction" | "token" | "address" | "block"
    ) => string;
  };
}

const chains: ChainObject = {
  [ChainId.ETHEREUM]: {
    link: "https://etherscan.io",
    builder: explorers.etherscan
  },
  [ChainId.ROPSTEN]: {
    link: "https://ropsten.etherscan.io",
    builder: explorers.etherscan
  },
  [ChainId.RINKEBY]: {
    link: "https://rinkeby.etherscan.io",
    builder: explorers.etherscan
  },
  [ChainId.GÖRLI]: {
    link: "https://goerli.etherscan.io",
    builder: explorers.etherscan
  },
  [ChainId.KOVAN]: {
    link: "https://kovan.etherscan.io",
    builder: explorers.etherscan
  },
  [ChainId.MATIC]: {
    link: "https://polygonscan.com",
    builder: explorers.etherscan
  },
  [ChainId.MATIC_TESTNET]: {
    link: "https://mumbai.polygonscan.com",
    builder: explorers.etherscan
  },
  [ChainId.FANTOM]: {
    link: "https://ftmscan.com",
    builder: explorers.etherscan
  },
  [ChainId.FANTOM_TESTNET]: {
    link: "https://testnet.ftmscan.com",
    builder: explorers.etherscan
  }
  //   [ChainId.BSC]: {
  //     link: 'https://bscscan.com',
  //     builder: explorers.etherscan,
  //   },
  //   [ChainId.BSC_TESTNET]: {
  //     link: 'https://testnet.bscscan.com',
  //     builder: explorers.etherscan,
  //   },
  //   [ChainId.ARBITRUM]: {
  //     link: 'https://arbiscan.io',
  //     builder: explorers.etherscan,
  //   },
  //   [ChainId.AVALANCHE]: {
  //     link: 'https://cchain.explorer.avax.network',
  //     builder: explorers.blockscout,
  //   },
  //   [ChainId.AVALANCHE_TESTNET]: {
  //     link: 'https://cchain.explorer.avax-test.network',
  //     builder: explorers.etherscan,
  //   },
};

export function getExplorerLink(
  chainId: number | undefined,
  data: string,
  type: "transaction" | "token" | "address" | "block"
): string {
  if (!chainId) return "";
  const chain = chains[chainId];
  return chain.builder(chain.link, data, type);
}
