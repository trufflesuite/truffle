export { generateId } from "@truffle/db/helpers";
export declare const fixturesDirectory: string;
export declare class WorkspaceClient {
  private workspace;
  constructor();
  execute(
    request: any,
    variables?: {}
  ): Promise<import("graphql/execution/execute").ExecutionResultDataDefault>;
}
export declare const Migrations: any;
