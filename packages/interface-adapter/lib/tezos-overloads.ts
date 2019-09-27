import { Web3Shim, Web3ShimOptions } from "./web3-shim";
import { Tezos } from '@taquito/taquito';

export const TezosDefinition = {
  async initNetworkType(web3: Web3Shim, options: Web3ShimOptions) {
    // web3 expects getId to return a hexString convertible to a number
    // for fabric-evm we ignore the hexToNumber output formatter
    overrides.getId(web3);
    overrides.getAccounts(web3, options);
  }
};

const overrides = {
  // The ts-ignores are ignoring the checks that are
  // saying that web3.eth.net.getId is a function and doesn't
  // have a `method` property, which it does
  getId: (web3: Web3Shim) => {
    // @ts-ignore
    const _oldGetId = web3.eth.net.getId;
    // @ts-ignore
    web3.eth.net.getId = async () => {
      // chaincode-fabric-evm currently returns a "fabric-evm" string
      // instead of a hex networkID. Instead of trying to decode the hexToNumber,
      // let's just accept `fabric-evm` as a valid networkID for now.
      // @ts-ignore
      const currentHost = web3.currentProvider.host;
      const parsedHost = currentHost.match(/(^https?:\/\/)(.*?)\:\d.*/)[2];
      // @ts-ignore
      await eztz.node.setProvider(parsedHost);
      // @ts-ignore
      const { chain_id } = await eztz.rpc.getHead();
      // @ts-ignore
      return chain_id;
    };
  },

  // The ts-ignores are ignoring the checks that are
  // saying that web3.eth.getAccounts is a function and doesn't
  // have a `method` property, which it does
  getAccounts: (web3: Web3Shim, { config } : Web3ShimOptions) => {
    // @ts-ignore
    const _oldGetAccounts = web3.eth.getAccounts;
    // @ts-ignore
    web3.eth.getAccounts = async () => {
      // chaincode-fabric-ev1Gm currently returns a "fabric-evm" string
      // instead of a hex networkID. Instead of trying to decode the hexToNumber,
      // let's just accept `fabric-evm` as a valid networkID for now.
      // @ts-ignore
      //      const currentHost = web3.currentProvider.host;
      //const parsedHost = currentHost.match(/(^https?:\/\/)(.*?)\:\d.*/)[2];
      // @ts-ignore
      /*
      const sotez = new Sotez(parsedHost)
      const res = await sotez.importKey('off during october arrive sister emotion case library narrow width barrel pool final boy toast', 'z8wZCNn0cC', 'krtuxjvm.gtqdzgqj@tezos.example.org');
      await console.log(await sotez.key.publicKeyHash())*/
      // @ts-ignore
      const sotez = new Sotez()
      //@ts-ignore
      await sotez.importKey(config.networks[config.network].mnemonic, config.networks[config.network].passphrase, config.networks[config.network].email)
      const currentAccount = await sotez.key.publicKeyHash()
      return currentAccount;
    };
  }
};
