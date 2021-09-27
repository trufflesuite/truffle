import Web3Eth from "web3-eth";
type PastLogsOptions = {
  toBlock?: string | number;
  fromBlock?: string | number;
  address?: string | string[];
}
import type BN from "bn.js";

export class Web3Adapter {
  public provider: any;
  private eth: any;

  constructor (provider: any) {
    this.provider = provider;
    // @ts-ignore - seems like the types are out of sync with the implementation
    this.eth = new Web3Eth(provider);
  }

  public async getCode (address: string, block: string | number) {
    return await this.eth.getCode(address, block);
  }

  public async getBlock (block: string | number) {
    return await this.eth.getBlock(block);
  }

  public async getPastLogs ({ address, fromBlock, toBlock }: PastLogsOptions): Promise<any[]> {
    return await this.eth.getPastLogs({ address, fromBlock, toBlock });
  }

  public async getNetworkId () {
    return (await this.eth.net.getId()).toString();
  }

  public async getBlockNumber (): Promise<number> {
    return await this.eth.getBlockNumber();
  }

  public async getBalance (address: string, blockNumber: any) {
    return await this.eth.getBalance(address, blockNumber);
  }

  public async getTransactionCount (contractAddress: string, blockNumber: any) {
    return this.eth.getTransactionCount(contractAddress, blockNumber);
  }

  public async getStorageAt (address: string, position: BN, block: string | number) {
    return this.eth.getStorageAt(address, position, block);
  }
}
