import {
  WorkflowCompileResult,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
/**
 * For a compilation result from @truffle/workflow-compile/new, generate a
 * sequence of GraphQL requests to submit to Truffle DB
 *
 * Returns a generator that yields requests to forward to Truffle DB.
 * When calling `.next()` on this generator, pass any/all responses
 * and ultimately returns nothing when complete.
 */
export declare function generateCompileLoad(
  result: WorkflowCompileResult,
  {
    directory
  }: {
    directory: string;
  }
): Generator<WorkspaceRequest, any, WorkspaceResponse<string>>;
