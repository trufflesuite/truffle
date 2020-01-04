declare module "@truffle/contract-schema" {
  import { ContractObject } from "@truffle/contract-schema/spec";
  export { ContractObject } from "@truffle/contract-schema/spec";

  namespace Schema {
    export function normalize(dirtyObj: object, opts?: object): ContractObject;
  }

  export default Schema;
}
