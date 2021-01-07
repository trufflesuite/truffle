import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:interface");

import { DocumentNode, ExecutionResult } from "graphql";

export interface Db {
  execute: (
    request: DocumentNode | string,
    variables: any
  ) => Promise<ExecutionResult>;
}
