import {
  CompiledContract,
  LoadedBytecodes,
  IdObject,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
import { AddContracts } from "./add.graphql";
export { AddContracts };
export interface LoadableContract {
  contract: CompiledContract;
  path: {
    sourceIndex: number;
    contractIndex: number;
  };
  bytecodes: LoadedBytecodes;
  compilation: IdObject<DataModel.ICompilation>;
}
export declare function generateContractsLoad(
  loadableContracts: LoadableContract[]
): Generator<
  WorkspaceRequest,
  DataModel.IContract[],
  WorkspaceResponse<"contractsAdd", DataModel.IContractsAddPayload>
>;
