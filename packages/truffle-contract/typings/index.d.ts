declare module "truffle-contract" {
  namespace TruffleContract {
    export interface TruffleContract {
      contractName: string;
      contract_name: string;
      updatedAt: string;
      networks: object;
    }
  }
  export default TruffleContract;
}
