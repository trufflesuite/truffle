import Web3Eth from "web3-eth";
type PastLogsOptions = {
  toBlock?: string | number;
  fromBlock?: string | number;
  address?: string | string[];
}
import type { BlockSpecifier } from "./types";
import type BN from "bn.js";

export class Web3Adapter {
  public provider: any;
  private eth: any;

  constructor (provider: any) {
    this.provider = provider;
    // @ts-ignore - seems like the types are out of sync with the implementation
    this.eth = new Web3Eth(provider);
  }

  public async getCode (address: string, block: BlockSpecifier) {
    let blockToFetch: string;
    if (typeof block === "string" && !isNaN(parseInt(block))) {
      // block is one of 'latest', 'pending', or 'genesis'
      blockToFetch = block;
    } else if (typeof block === "number") {
      blockToFetch = `0x${block.toString(16)}`;
    } else {
      throw new Error(
        "The block specified must be a number or one of the strings 'latest'," +
        "'pending', or 'genesis'."
      );
    }

    return await this.provider.send({
      jsonrpc: "2.0",
      method: "eth_getCode",
      id: new Date().getTime(),
      params: [
        address,
        blockToFetch
      ]
    });
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
