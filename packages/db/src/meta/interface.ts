import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:interface");

import gql from "graphql-tag";
import { print } from "graphql/language/printer";
import { GraphQLSchema, DocumentNode, ExecutionResult, execute } from "graphql";
import { ApolloServer } from "apollo-server";
import type TruffleConfig from "@truffle/config";

import { Collections } from "./collections";
import { Workspace } from "./data";
import * as Pouch from "./pouch";

export interface Db<_C extends Collections> {
  /**
   * Perform a query or mutation via GraphQL interface
   */
  execute(
    request: DocumentNode | string,
    variables: any
  ): Promise<ExecutionResult>;
}

export interface ConnectOptions<_C extends Collections> {
  workingDirectory: string;
  adapter?: Pouch.Adapters.AdapterOptions;
}

export const forAttachAndSchema = <C extends Collections>(options: {
  attach: (options: Pouch.Adapters.AttachOptions) => Workspace<C>;
  schema: GraphQLSchema;
}) => {
  const { attach, schema } = options;

  const connect = (config: TruffleConfig | ConnectOptions<C>): Db<C> => {
    const options =
      "working_directory" in config // TruffleConfig case
        ? toConnectOptions(config)
        : (config as ConnectOptions<C>);

    const workspace = attach(options);

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

  const serve = (config: TruffleConfig | ConnectOptions<C>) => {
    const options =
      "working_directory" in config // TruffleConfig case
        ? toConnectOptions(config)
        : (config as ConnectOptions<C>);

    const workspace = attach(options);

    return new ApolloServer({
      tracing: true,
      schema,
      context: { workspace }
    });
  };

  return { connect, serve };
};

function toConnectOptions<C extends Collections>(
  config: TruffleConfig
): ConnectOptions<C> {
  return {
    workingDirectory: config.working_directory,
    adapter: (config.db || {}).adapter
  };
}
