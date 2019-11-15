declare module "@truffle/contract-schema" {
  import { ContractObject as SpecContractObject } from "@truffle/contract-schema/spec";

  namespace Schema {
    export function normalize(
      dirtyObj: object,
      opts?: object
    ): SpecContractObject;
  }

  export type ContractObject = SpecContractObject;
  export default Schema;
}
