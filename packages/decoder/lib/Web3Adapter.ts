import { Eth } from "web3-eth";
type PastLogsOptions = {
  toBlock?: string | number;
  fromBlock?: string | number;
  address?: string | string[];
}
import type BN from "bn.js";

export class Web3Adapter {
  public provider: any;
  public Eth: Eth;

  constructor (provider: any) {
    this.provider = provider;
    this.Eth = new Eth(provider);
  }

  public async getCode (address: string, block: string | number) {
    return await this.Eth.getCode(address, block);
  }

  public async getBlock (block: string | number) {
    return await this.Eth.getBlock(block);
  }

  public async getPastLogs ({ address, fromBlock, toBlock }: PastLogsOptions): Promise<any[]> {
    return await this.Eth.getPastLogs({ address, fromBlock, toBlock });
  }

  public async getNetworkId (): Promise<string> {
    return (await this.Eth.net.getId()).toString();
  }

  public async getBlockNumber (): Promise<number> {
    return await this.Eth.getBlockNumber();
  }

  public async getBalance (address: string, blockNumber: any) {
    return await this.Eth.getBalance(address, blockNumber);
  }

  public async getTransactionCount (contractAddress: string, blockNumber: any) {
    return this.Eth.getTransactionCount(contractAddress, blockNumber);
  }

  public async getStorageAt (address: string, position: BN, block: string | number) {
    return this.Eth.getStorageAt(address, position, block);
  }
}
