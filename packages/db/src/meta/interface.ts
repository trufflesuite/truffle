import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:interface");

import gql from "graphql-tag";
import { print } from "graphql/language/printer";
import { GraphQLSchema, DocumentNode, ExecutionResult, execute } from "graphql";
import { ApolloServer } from "apollo-server";

import type { Collections } from "./collections";
import type { Workspace } from "./data";
import * as Pouch from "./pouch";
import Configstore from "configstore";
import * as path from "path";

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
  directory?: string;
  adapter?: Pouch.Adapters.AdapterOptions;
}

export const forAttachAndSchema = <C extends Collections>(options: {
  attach: (options: Pouch.Adapters.AttachOptions) => Workspace<C>;
  schema: GraphQLSchema;
}) => {
  const { attach, schema } = options;

  const connect = (config?: ConnectOptions<C>): Db<C> => {
    let attachOptions;
    if (config && "directory" in config) {
      // ConnectOptions case
      attachOptions = config;
    } else {
      const configStore = new Configstore(
        "truffle",
        {},
        { globalConfigPath: true }
      );
      const truffleDataDirectory = path.dirname(configStore.path);
      attachOptions = {
        directory: truffleDataDirectory,
        adapter: (config || {}).adapter
      };
    }
    const workspace = attach(attachOptions);

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

  const serve = (config?: ConnectOptions<C>) => {
    let attachOptions;
    if (config && "directory" in config) {
      // ConnectOptions case
      attachOptions = config;
    } else {
      const configStore = new Configstore(
        "truffle",
        {},
        { globalConfigPath: true }
      );
      const truffleDataDirectory = path.dirname(configStore.path);
      attachOptions = {
        directory: truffleDataDirectory,
        adapter: (config || {}).adapter
      };
    }
    const workspace = attach(attachOptions);

    return new ApolloServer({
      tracing: true,
      schema,
      context: { workspace }
    });
  };

  return { connect, serve };
};
