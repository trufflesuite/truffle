import { Web3Shim, Web3ShimOptions } from "./web3-shim";
import { Tezos } from '@taquito/taquito';

export const TezosDefinition = {
  async initNetworkType(web3: Web3Shim, options: Web3ShimOptions) {
    overrides.getId(web3);
    overrides.getAccounts(web3, options);
    overrides.getBlock(web3);
    overrides.getBlockNumber(web3);
    overrides.getBalance(web3);
  }
};

const overrides = {
  getId: (web3: Web3Shim) => {
    // here we define a tez namespace &
    // attach our Tezos provider to the Web3Shim
    web3.tez = Tezos;
    const _oldGetId = web3.eth.net.getId;
    // @ts-ignore
    web3.eth.net.getId = async () => {
      const currentHost = web3.currentProvider.host;
      // web3 has some neat quirks
      const parsedHost = currentHost.match(/(^https?:\/\/)(.*?)\:\d.*/)[2];
      // sets the provider for subsequent Tezos provider calls
      await web3.tez.setProvider({ rpc: parsedHost })
      // @ts-ignore (typings incomplete)
      const { chainId } = await web3.tez.rpc.getBlockHeader();
      return chainId;
    };
  },

  getAccounts: (web3: Web3Shim, { config } : Web3ShimOptions) => {
    // @ts-ignore
    const _oldGetAccounts = web3.eth.getAccounts;
    // @ts-ignore
    web3.eth.getAccounts = async () => {
      // here we import user's faucet account:
      // email, passphrase, mnemonic, & secret are all REQUIRED.
      // TODO: all logic to check if user is importing only a private secret key
      // that would unlock the account, or a psk w/ passphrase
      let mnemonic = config.networks[config.network].mnemonic;
      if (Array.isArray(mnemonic)) mnemonic = mnemonic.join(" ")
      await web3.tez.importKey(
        config.networks[config.network].email,
        config.networks[config.network].passphrase,
        mnemonic,
        config.networks[config.network].secret
      )

      const currentAccount = await web3.tez.signer.publicKeyHash();
      return [ currentAccount ];
    };
  },

  getBlock: (web3: Web3Shim) => {
    const _oldGetBlock = web3.eth.getBlock;

    // @ts-ignore
    web3.eth.getBlock = async (blockNumber = "head") => {
      // translate ETH nomenclature to XTZ
      // @ts-ignore
      if (blockNumber === "latest") blockNumber = "head";
      const { hardGasLimitPerBlock } = await web3.tez.rpc.getConstants();
      const block = await web3.tez.rpc.getBlockHeader({ block: `${blockNumber}` })
      // @ts-ignore
      block.gasLimit = hardGasLimitPerBlock;
      return block;
    };
  },

  getBlockNumber: (web3: Web3Shim) => {
    const _oldGetBlockNumber = web3.eth.getBlockNumber;

    web3.eth.getBlockNumber = async () => {
      const { level } = await web3.tez.rpc.getBlockHeader();
      return level;
    };
  },

  getBalance: (web3: Web3Shim) => {
    // since this is used in the tez reporter,
    // decided to namespace a specific tez getBalance method
    // @ts-ignore
    web3.tez.getBalance = async(address) => {
      const balance = (await web3.tez.tz.getBalance(address)).toString();
      return balance;
    };
  }
};
