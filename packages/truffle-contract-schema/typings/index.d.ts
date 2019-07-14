declare module "truffle-contract-schema" {
  import Contract from "truffle-contract";
  namespace Schema {
    export function normalize(dirtyObj: object, opts?: object): Contract.TruffleContract;
  }
  export default Schema;
}
