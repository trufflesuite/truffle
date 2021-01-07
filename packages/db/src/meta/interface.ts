import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:interface");

import gql from "graphql-tag";
import { print } from "graphql/language/printer";
import { GraphQLSchema, DocumentNode, ExecutionResult, execute } from "graphql";
const { ApolloServer } = require("apollo-server");
import type TruffleConfig from "@truffle/config";

import { Collections } from "./collections";
import { Workspace } from "./data";
import * as Pouch from "./pouch";

export interface Db {
  execute: (
    request: DocumentNode | string,
    variables: any
  ) => Promise<ExecutionResult>;
}

export const forAttachAndSchema = <C extends Collections>(options: {
  attach: (config: Pouch.DatabasesConfig) => Workspace<C>;
  schema: GraphQLSchema;
}) => {
  const { attach, schema } = options;

  const connect = (config: TruffleConfig): Db => {
    const workspace = attach({
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

  const serve = (config: TruffleConfig) => {
    const workspace = attach({
      workingDirectory: config.working_directory,
      adapter: (config.db || {}).adapter
    });

    return new ApolloServer({
      tracing: true,
      schema,
      context: { workspace }
    });
  };

  return { connect, serve };
};
