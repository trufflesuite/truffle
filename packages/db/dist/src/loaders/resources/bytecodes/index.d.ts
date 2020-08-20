import {
  CompilationData,
  LoadedBytecodes,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
import { AddBytecodes } from "./add.graphql";
export { AddBytecodes };
/**
 * @dev pre-condition: every contract should have both bytecodes
 */
export declare function generateBytecodesLoad(
  compilation: CompilationData
): Generator<
  WorkspaceRequest,
  LoadedBytecodes,
  WorkspaceResponse<"bytecodesAdd", DataModel.IBytecodesAddPayload>
>;
