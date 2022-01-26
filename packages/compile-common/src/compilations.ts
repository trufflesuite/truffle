import type { CompilerResult, WorkflowCompileResult } from "./types";

export function promoteCompileResult(
  result: CompilerResult
): WorkflowCompileResult {
  const { compilations } = result;
  const contracts = compilations.flatMap(compilation => compilation.contracts);
  return { compilations, contracts };
}

export function emptyWorkflowCompileResult(): WorkflowCompileResult {
  return { compilations: [], contracts: [] };
}
