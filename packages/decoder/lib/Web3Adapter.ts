import { Eth } from "web3-eth";
type PastLogsOptions = {
  toBlock?: string | number;
  fromBlock?: string | number;
  address?: string | string[];
}

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

  public async getPastLogs ({ address, fromBlock, toBlock }: PastLogsOptions): Promise<any> {
    return await this.Eth.getPastLogs({ address, fromBlock, toBlock });
  }
}
