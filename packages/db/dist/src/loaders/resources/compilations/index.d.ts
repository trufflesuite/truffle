import {
  CompilationData,
  LoadedSources,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
import { AddCompilations } from "./add.graphql";
export { AddCompilations };
export { GetCompilation } from "./get.graphql";
declare type LoadableCompilation = {
  compilation: CompilationData;
  sources: LoadedSources;
};
export declare function generateCompilationsLoad(
  loadableCompilations: LoadableCompilation[]
): Generator<
  WorkspaceRequest,
  DataModel.ICompilation[],
  WorkspaceResponse<"compilationsAdd", DataModel.ICompilationsAddPayload>
>;
