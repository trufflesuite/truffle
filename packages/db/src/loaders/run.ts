import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:run");

import { promisify } from "util";
import type {Provider} from "web3/providers";
import {DocumentNode} from "graphql";

import { Loader, LoadRequest, GraphQlRequest, Web3Request, RequestType } from "./types";

export type LoaderRunner = < A extends unknown[],
  T = any,
  R extends RequestType | undefined = undefined
>(
  loader: Loader<A, T, R>,
  ...args: A
) => Promise<T>;

export interface Db {
  query: (query: DocumentNode | string, variables: any) => Promise<any>;
}

export const forDb = (db: Db): {
  forProvider(provider: Provider): {
    run: LoaderRunner
  };
  run: LoaderRunner;
} => {
  const connections = {
    db,
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
      }
    }
  };
}

const run = async <
  Args extends unknown[],
  Return,
  R extends RequestType | undefined
>(
  connections: { db: Db, provider?: Provider },
  loader: Loader<Args, Return, R>,
  ...args: Args
) => {
  const saga = loader(...args);
  let current = saga.next();

  while (!current.done) {
    const loadRequest = current.value as LoadRequest<R>;
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
