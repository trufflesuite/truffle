import { InterfaceAdapter, BlockType } from "../types";
import Config from "@truffle/config";
import { Provider } from "web3/providers";
import { TezosToolkit, Tezos, SetProviderOptions } from "@taquito/taquito";

export interface TezosAdapterOptions {
  provider?: Provider;
  networkType?: string;
  config?: SetProviderOptions["config"];
}

export class TezosAdapter implements InterfaceAdapter {
  public tezos: TezosToolkit;
  constructor({ provider, config }: TezosAdapterOptions) {
    this.tezos = Tezos;
    this.setProvider({ provider, config });
  }

  public async getNetworkId() {
    const { chain_id } = await this.tezos.rpc.getBlockHeader();
    return chain_id;
  }

  public async getBlock(blockNumber: BlockType) {
    // translate ETH nomenclature to XTZ
    if (blockNumber === "latest") blockNumber = "head";
    const { hard_gas_limit_per_block } = await this.tezos.rpc.getConstants();
    const block = await this.tezos.rpc.getBlockHeader({
      block: `${blockNumber}`
    });
    // @ts-ignore: Property 'gasLimit' does not exist on type 'BlockHeaderResponse'.
    block.gasLimit = hard_gas_limit_per_block;
    return block;
  }

  public async getTransaction(tx: string) {
    //  return this.web3.eth.getTransaction(tx);
    return;
  }

  public async getTransactionReceipt(tx: string) {
    //  return this.web3.eth.getTransactionReceipt(tx);
    return;
  }

  public async getBalance(address: string) {
    const balance = (await this.tezos.tz.getBalance(address)).toString();
    return balance;
  }

  public async getCode(address: string) {
    const storage = await this.tezos.contract.getStorage(address);
    return storage as string;
  }

  public async getAccounts(config: Config) {
    await this.setWallet(config);
    const currentAccount = await this.tezos.signer.publicKeyHash();
    return [currentAccount];
  }

  public async estimateGas(transactionConfig: any) {
    //    return this.web3.eth.estimateGas(transactionConfig);
    return 0;
  }

  public async getBlockNumber() {
    const { level } = await this.tezos.rpc.getBlockHeader();
    return level;
  }

  public setProvider({
    provider,
    config = { confirmationPollingIntervalSecond: 1 }
  }: TezosAdapterOptions) {
    // @ts-ignore: Property 'host' does not exist on type 'Provider'.
    const { host } = provider;
    let currentHost;
    if (host) {
      currentHost = host;
    } else {
      currentHost = provider;
    }

    return this.tezos.setProvider({ rpc: currentHost, config });
  }

  public async setWallet(config: Config) {
    const { networks, network } = config;
    let { mnemonic, secretKey } = networks[network];

    if (mnemonic) {
      // here we import user's faucet account:
      // email, password, mnemonic, & secret are all REQUIRED.
      if (Array.isArray(mnemonic)) mnemonic = mnemonic.join(" ");
      try {
        return await this.tezos.importKey(
          networks[network].email,
          networks[network].password,
          mnemonic,
          networks[network].secret
        );
      } catch (error) {
        throw Error(
          `Faucet account invalid or incorrectly imported in truffle config file (config.networks[${network}]).`
        );
      }
    }

    if (secretKey) {
      try {
        return await this.tezos.importKey(secretKey);
      } catch (error) {
        throw Error(
          `Secret key invalid or incorrectly imported in truffle config file (config.networks[${network}].secretKey).`
        );
      }
    }

    // TODO: add logic to check if user is importing a psk w/ password
    throw Error(
      `No faucet account or secret key detected in truffle config file (config.networks[${network}]).`
    );
  }
}
