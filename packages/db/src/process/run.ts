import { logger } from "@truffle/db/logger";
const debug = logger("db:process:run");

import { promisify } from "util";
import type { Provider } from "web3/providers";
import { DocumentNode } from "graphql";

import { Collections } from "@truffle/db/meta";

import {
  Processor,
  ProcessRequest,
  GraphQlRequest,
  Web3Request,
  RequestType
} from "./types";

export type ProcessorRunner<C extends Collections> = <
  A extends unknown[],
  T = any,
  R extends RequestType<C> | undefined = undefined
>(
  loader: Processor<C, A, T, R>,
  ...args: A
) => Promise<T>;

export interface Db {
  query: (query: DocumentNode | string, variables: any) => Promise<any>;
}

export const forDb = <C extends Collections>(
  db: Db
): {
  forProvider(
    provider: Provider
  ): {
    run: ProcessorRunner<C>;
  };
  run: ProcessorRunner<C>;
} => {
  const connections = {
    db
  };

  return {
    run(loader, ...args) {
      return run(connections, loader, ...args);
    },

    forProvider(provider) {
      const connections = {
        db,
        provider
      };

      return {
        run: (loader, ...args) => run(connections, loader, ...args)
      };
    }
  };
};

const run = async <
  C extends Collections,
  Args extends unknown[],
  Return,
  R extends RequestType<C> | undefined
>(
  connections: { db: Db; provider?: Provider },
  loader: Processor<C, Args, Return, R>,
  ...args: Args
) => {
  const saga = loader(...args);
  let current = saga.next();

  while (!current.done) {
    const loadRequest = current.value as ProcessRequest<C, R>;
    switch (loadRequest.type) {
      case "graphql": {
        const { db } = connections;
        const { request, variables } = loadRequest as GraphQlRequest;
        const response = await db.query(request, variables);

        current = saga.next(response);

        break;
      }
      case "web3": {
        if (!connections.provider) {
          throw new Error("Missing provider; cannot communicate with network");
        }

        const { provider } = connections;

        const { method, params } = loadRequest as Web3Request;

        const payload: any = {
          jsonrpc: "2.0",
          method,
          params
        };

        const response: any = await promisify(provider.send)(payload);

        current = saga.next(response);

        break;
      }
      default: {
        throw new Error(`Unknown request type ${loadRequest.type}`);
      }
    }
  }

  return current.value;
};
