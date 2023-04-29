export interface ProvisionerOptions {
  provider: any;
  network_id: number;
  network: string;
  networks: any;
  //
  ens?: any;
  //
  from?: string;
  gas?: number | string;
  gasPrice?: number | string;
  maxFeePerGas?: number | string;
  maxPriorityFeePerGas?: number | string;
  type?: string;
}
