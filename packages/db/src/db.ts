import { logger } from "@truffle/db/logger";
const debug = logger("db:db");

import gql from "graphql-tag";
import { print } from "graphql/language/printer";
import { DocumentNode, ExecutionResult, execute } from "graphql";

import type TruffleConfig from "@truffle/config";

import { Db } from "./meta";
export { Db }; // rather than force src/index from touching meta

import { Workspace } from "./resources";
import { schema } from "./schema";
import { attach } from "./workspace";

export const connect = (config: TruffleConfig): Db => {
  const workspace: Workspace = attach({
    workingDirectory: config.working_directory,
    adapter: (config.db || {}).adapter
  });

  return {
    async execute(
      request: DocumentNode | string,
      variables: any = {}
    ): Promise<ExecutionResult> {
      const document =
        typeof request === "string"
          ? gql`
              ${request}
            `
          : request;
      const response = await execute(
        schema,
        document,
        null,
        { workspace },
        variables
      );

      if (response.errors) {
        debug("request %s", print(document));
        debug("errors %O", response.errors);
      }

      return response;
    }
  };
};
