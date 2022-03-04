import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:interface");

import gql from "graphql-tag";
import { print } from "graphql/language/printer";
import { GraphQLSchema, DocumentNode, ExecutionResult, execute } from "graphql";
import { ApolloServer } from "apollo-server";

import type { Collections } from "./collections";
import type { Workspace } from "./data";
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
  adapter?: Pouch.Adapters.AdapterOptions;
}

export const forAttachAndSchema = <C extends Collections>(options: {
  attach: (options: Pouch.Adapters.AttachOptions) => Workspace<C>;
  schema: GraphQLSchema;
}) => {
  const { attach, schema } = options;

  const connect = (connectOptions?: ConnectOptions<C>): Db<C> => {
    const attachOptions = {
      adapter: (connectOptions || {}).adapter
    };
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

  const serve = (serveOptions?: ConnectOptions<C>) => {
    const attachOptions = {
      adapter: (serveOptions || {}).adapter
    };
    const workspace = attach(attachOptions);

    return new ApolloServer({
      schema,
      context: { workspace }
    });
  };

  return { connect, serve };
};
