import type { BlockSpecifier, RegularizedBlockSpecifier } from "./types";
import type BN from "bn.js";
import type { Provider } from "web3/providers";
type PastLogsOptions = {
  toBlock?: string | number;
  fromBlock?: string | number;
  address?: string | string[];
};
type SendRequestArgs = {
  method: string;
  params: unknown[];
};
type RPCResponse = {
  id: number;
  jsonrpc: string;
  result: any;
};

const formatBlockSpecifier = (block: BlockSpecifier): string => {
  if (typeof block === "string" && !isNaN(parseInt(block))) {
    // block is one of 'latest', 'pending', or 'genesis'
    return block === "genesis" ?
      // convert old web3 input format which uses 'genesis'
      "earliest" :
      block;
  } else if (typeof block === "number") {
    return `0x${block.toString(16)}`;
  } else {
    throw new Error(
      "The block specified must be a number or one of the strings 'latest'," +
      "'pending', or 'earliest'."
    );
  }
}


export class Web3Adapter {
  public provider: Provider | any; // TODO: find a better type for 1193 stuff

  constructor (provider: any) {
    this.provider = provider;
  }

  private async sendRequest ({
    method,
    params
  }: SendRequestArgs): Promise<any> {
    if (!this.provider) {
      throw new Error("There is not a valid provider present.")
    }
    // check to see if the provider is compliant with eip1193
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
    if (this.provider.request) {
      return (await this.provider.request({ method, params })).result;
    }
    return (await this.provider.send({
      jsonrpc: "2.0",
      id: new Date().getTime(),
      method,
      params
    })).result;
  }

  public async getCode (address: string, block: RegularizedBlockSpecifier) {
    const blockToFetch = formatBlockSpecifier(block);
    return await this.sendRequest({
      method: "eth_getCode",
      params: [
        address,
        blockToFetch
      ]
    });
  }

  public async getBlock (block: BlockSpecifier) {
    const blockToFetch = formatBlockSpecifier(block);
    return await this.sendRequest({
      method: "eth_getBlock",
      params: [ blockToFetch ]
    });
  }

  public async getPastLogs ({ address, fromBlock, toBlock }: PastLogsOptions): Promise<any[]> {
    return await this.sendRequest({
      method: "eth_getLogs",
      params: [{ fromBlock, toBlock, address }]
    });
  }

  public async getNetworkId (): Promise<string> {
    return await this.sendRequest({
      method: "net_version",
      params: []
    });
  }

  public async getBlockNumber (): Promise<RegularizedBlockSpecifier> {
    return await this.sendRequest({
      method: "eth_blockNumber",
      params: []
    });
  }

  public async getBalance (address: string, block: BlockSpecifier): Promise<string> {
    return await this.sendRequest({
      method: "eth_getBalance",
      params: [
        address,
        formatBlockSpecifier(block)
      ]
    });
  }

  public async getTransactionCount (contractAddress: string, block: BlockSpecifier): Promise<string> {
    return await this.sendRequest({
      method: "eth_getTransactionCount",
      params: [
        contractAddress,
        formatBlockSpecifier(block)
      ]
    });
  }

  public async getStorageAt (address: string, position: BN, block: BlockSpecifier) {
    return await this.sendRequest({
      method: "eth_getStorageAt",
      params: [
        address,
        position,
        formatBlockSpecifier(block)
      ]
    })
  }
}
