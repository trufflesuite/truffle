declare module "@truffle/contract-schema" {
  import { ContractObject } from "@truffle/contract-schema/spec";
  export { ContractObject } from "@truffle/contract-schema/spec";

  namespace Schema {
    export function validate(contractObject: ContractObject): ContractObject;
    export function normalize(
      objDirty: object,
      options?: object
    ): ContractObject;
  }

  export default Schema;
}
