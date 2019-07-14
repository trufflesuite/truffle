declare module "truffle-contract-schema" {
  namespace Schema {
    export interface TruffleContract {
      contractName: string;
      contract_name: string;
      updatedAt: string;
      networks: object;
    }

    export function normalize(dirtyObj: object, opts?: object): TruffleContract;
  }
  export default Schema;
}
