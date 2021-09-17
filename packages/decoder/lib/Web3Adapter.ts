import eth from "web3-eth";

export class Web3Adapter {
  public provider: any;

  constructor (provider: any) {
    this.provider = provider;
  }

  async getCode (address: string, block: string) {
    return await eth.getCode(address, block);
  }

  async getBlock (block: string) {
    return await eth.getBlock(block);
  }

  async getPastLogs (address: string, from: string, to: string) {
    return await eth.getPastLogs(address, from, to);
  }
}
