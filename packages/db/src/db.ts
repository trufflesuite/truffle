import { logger } from "@truffle/db/logger";
const debug = logger("db:db");

import gql from "graphql-tag";
import { DocumentNode, ExecutionResult, execute } from "graphql";
import type TruffleConfig from "@truffle/config";

import { Db } from "./resources";
import { schema } from "./schema";
import { Workspace, attach } from "./workspace";

export const connect = (config: TruffleConfig): Db => {
  const workspace: Workspace = attach({
    workingDirectory: config.working_directory,
    adapter: (config.db || {}).adapter
  });

  return {
    async execute(
      request: DocumentNode | string,
      variables: object
    ): Promise<ExecutionResult> {
      const response = await execute(
        schema,
        typeof request === "string"
          ? gql`
              ${request}
            `
          : request,
        null,
        { workspace },
        variables
      );

      if (response.errors) {
        debug("errors %o", response.errors);
      }

      return response;
    }
  };
};
