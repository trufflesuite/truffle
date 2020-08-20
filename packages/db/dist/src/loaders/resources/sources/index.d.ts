import {
  CompilationData,
  LoadedSources,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
import { AddSources } from "./add.graphql";
export { AddSources };
export declare function generateSourcesLoad(
  compilation: CompilationData
): Generator<
  WorkspaceRequest,
  LoadedSources,
  WorkspaceResponse<"sourcesAdd", DataModel.ISourcesAddPayload>
>;
