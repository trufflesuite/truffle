import {
  CompiledContract,
  CompilationData,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";

import { AddSources } from "./add.graphql";
export { AddSources };

const contractSourceInput = ({
  contract: { sourcePath, source: contents }
}: {
  contract: CompiledContract;
}): DataModel.ISourceInput => ({
  contents,
  sourcePath
});

const compilationSourceInputs = ({
  compilation: { contracts }
}: {
  compilation: CompilationData;
}): DataModel.ISourceInput[] =>
  contracts.map(contract => contractSourceInput({ contract }));

// returns list of IDs
export function* generateSourcesLoad(
  compilation: CompilationData
): Generator<
  WorkspaceRequest,
  DataModel.ISource[],
  WorkspaceResponse<"sourcesAdd", DataModel.ISourcesAddPayload>
> {
  // for each compilation, we need to load sources for each of the contracts
  const sources = compilationSourceInputs({ compilation });

  const result = yield {
    request: AddSources,
    variables: { sources }
  };

  return result.data.workspace.sourcesAdd.sources;
}
