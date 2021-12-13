import debugModule from "debug";
const debug = debugModule("decoder:adapter");
import type { BlockSpecifier, RegularizedBlockSpecifier } from "./types";
import type BN from "bn.js";
import type {
  Provider as LegacyProvider,
  Callback,
  JsonRPCResponse
} from "web3/providers";

// lifted from @types/web3
type Log = {
  address: string;
  data: string;
  topics: string[];
  logIndex: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
};
type PastLogsOptions = {
  toBlock?: string | number;
  fromBlock?: string | number;
  address?: string | string[];
};
type SendRequestArgs = {
  method: string;
  params: unknown[];
};
type Eip1193Provider = {
  request: (options: {
    method: string;
    params?: unknown[] | object;
  }) => Promise<any>;
};
type Block = {
  number: string;
  hash: string;
  parentHash: string;
  mixHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionsRoot: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  size: string;
  gasLimit: string;
  gasUsed: string;
  timestamp: string;
  transactions: string[];
  uncles: string[];
};
const stringWhitelist = ["latest", "pending", "genesis", "earliest"];

const formatBlockSpecifier = (block: BlockSpecifier): string => {
  if (typeof block === "string" && stringWhitelist.includes(block)) {
    // block is one of 'latest', 'pending', 'earliest', or 'genesis'
    return block === "genesis"
      ? // convert old web3 input format which uses 'genesis'
        "earliest"
      : block;
  } else if (typeof block === "string" && !isNaN(parseInt(block))) {
    // block is a string representation of a number
    if (block.startsWith("0x")) return block;
    // convert to hex and add '0x' prefix in case block is decimal
    return `0x${parseInt(block).toString(16)}`;
  } else if (typeof block === "number") {
    return `0x${block.toString(16)}`;
  } else {
    throw new Error(
      "The block specified must be a number or one of the strings 'latest'," +
        "'pending', or 'earliest'."
    );
  }
};

type Provider = LegacyProvider | Eip1193Provider;

// EIP-1193 providers use `request()` instead of `send()`
// NOTE this provider returns `response.result` already unwrapped
// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
const isEip1193Provider = (
  provider: Provider
): provider is Eip1193Provider => "request" in provider;

export class ProviderAdapter {
  public provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  private async sendRequest({ method, params }: SendRequestArgs): Promise<any> {
    if (!this.provider) {
      throw new Error("There is not a valid provider present.");
    }

    if (isEip1193Provider(this.provider)) {
      return await this.provider.request({ method, params });
    } else {
      // HACK MetaMask's injected provider doesn't allow `.send()` with
      // a callback, so prefer `.sendAsync()` if it's defined
      const send: LegacyProvider["send"] = (
        "sendAsync" in this.provider
          ? // uses `any` because LegacyProvider type doesn't define sendAsync
            (this.provider as any).sendAsync
          : (this.provider as LegacyProvider).send
      ).bind(this.provider);

      // HACK this uses a manual `new Promise` instead of promisify because
      // users reported difficulty running this package in a browser extension
      return await new Promise(
        (accept, reject) =>
          send(
            {
              jsonrpc: "2.0",
              id: new Date().getTime(),
              method,
              params
            },
            ((error: Error, response: JsonRPCResponse) => {
              if (error) {
                return reject(error);
              }

              const { result } = response;
              accept(result);
            }) as Callback<JsonRPCResponse>
          )
      );
    }
  }

  public async getCode(
    address: string,
    block: RegularizedBlockSpecifier
  ): Promise<string> {
    const blockToFetch = formatBlockSpecifier(block);
    return await this.sendRequest({
      method: "eth_getCode",
      params: [address, blockToFetch]
    });
  }

  public async getBlockByNumber(block: BlockSpecifier): Promise<Block> {
    const blockToFetch = formatBlockSpecifier(block);
    return await this.sendRequest({
      method: "eth_getBlockByNumber",
      params: [blockToFetch, false]
    });
  }

  public async getPastLogs({
    address,
    fromBlock,
    toBlock
  }: PastLogsOptions): Promise<Log[]> {
    return await this.sendRequest({
      method: "eth_getLogs",
      params: [{ fromBlock, toBlock, address }]
    });
  }

  public async getNetworkId(): Promise<string> {
    return await this.sendRequest({
      method: "net_version",
      params: []
    });
  }

  public async getBlockNumber(): Promise<number> {
    const result = await this.sendRequest({
      method: "eth_blockNumber",
      params: []
    });
    // return decimal
    return parseInt(result);
  }

  public async getBalance(
    address: string,
    block: BlockSpecifier
  ): Promise<string> {
    const result = await this.sendRequest({
      method: "eth_getBalance",
      params: [address, formatBlockSpecifier(block)]
    });
    // return value in decimal format
    return parseInt(result).toString();
  }

  public async getTransactionCount(
    address: string,
    block: BlockSpecifier
  ): Promise<string> {
    const result = await this.sendRequest({
      method: "eth_getTransactionCount",
      params: [address, formatBlockSpecifier(block)]
    });
    // return value in decimal format
    return parseInt(result).toString();
  }

  public async getStorageAt(
    address: string,
    position: BN,
    block: BlockSpecifier
  ): Promise<string> {
    return await this.sendRequest({
      method: "eth_getStorageAt",
      params: [address, `0x${position.toString(16)}`, formatBlockSpecifier(block)]
    });
  }
}
