declare module "truffle-contract" {
  export interface TruffleContract {
    contractName: string;
    abi: any[];
    bytecode: string;
    deployedBytecode: string;
    sourceMap: string;
    deployedSourceMap: string;
    source: string;
    sourcePath: string;
    ast: any;
    legacyAST: any;
    compiler: {
      name: string;
      version: string;
    };
    networks: {
      [id: string]: {
        events: any;
        links: any;
        address: string;
        transactionHash: string;
      }
    };
    schemaVersion: string;
    updatedAt: string;
  }

  export interface TruffleContractInstance extends TruffleContract {
    address: string;
  }
}