import { InterfaceAdapter, BlockType } from "../types";
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner, importKey } from '@taquito/signer';

export interface TezosAdapterOptions {
  network_config?: any;
}

export class TezosAdapter implements InterfaceAdapter {
  public tezos: TezosToolkit;
  constructor({ network_config }: TezosAdapterOptions) {
    this.tezos = new TezosToolkit(network_config?.host);
    this.setWallet(network_config);
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

  public async getTransaction(_: string) {
    throw Error(`Sorry, "getTransaction" is not supported for tezos.`);
  }

  public async getTransactionReceipt(_: string) {
    throw Error(`Sorry, "getTransactionReceipt" is not supported for tezos.`);
  }

  public async getBalance(address: string) {
    const balance = (await this.tezos.tz.getBalance(address)).toString();
    return balance;
  }

  public async getCode(address: string) {
    const storage = await this.tezos.contract.getStorage(address);
    return storage as string;
  }

  public async getAccounts() {
    const currentAccount = await this.tezos.signer.publicKeyHash();
    return Promise.resolve([currentAccount]);
  }

  public async estimateGas(_: any) {
    return Promise.resolve(0);
  }

  public async getBlockNumber() {
    const { level } = await this.tezos.rpc.getBlockHeader();
    return level;
  }

  public async setWallet(wallet: any) {
    let { secretKey, mnemonic, email, password, secret } = wallet;

    if (mnemonic) {
      // here we import user's faucet account:
      // email, password, mnemonic, & secret are all REQUIRED.
      if (Array.isArray(mnemonic)) mnemonic = mnemonic.join(" ");
      try {
        await importKey(
          this.tezos,
          email,
          password,
          mnemonic,
          secret);
        return;
      } catch (error) {
        throw Error("Faucet account invalid or incorrectly imported in truffle config file.");
      }
    }

    if (secretKey) {
      try {
        this.tezos.setProvider({
          signer: new InMemorySigner(secretKey)
        });
        return;
      } catch (error) {
        throw Error("Secret key invalid or incorrectly imported in truffle config file.");
      }
    }

    // TODO: add logic to check if user is importing a psk w/ password
    throw Error("No faucet account or secret key detected in truffle config file.");
  }
}
