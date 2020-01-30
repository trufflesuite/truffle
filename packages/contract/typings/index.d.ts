declare module "@truffle/contract" {
  import { ContractObject } from "@truffle/contract-schema";
  namespace TruffleContract {
    export type Contract = ContractObject;
  }
  export default TruffleContract;
}
