import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:process:run");

import { promisify } from "util";
import type { Provider } from "web3/providers";

import { Collections } from "@truffle/db/meta/collections";
import { Db } from "@truffle/db/meta/interface";

import {
  Definitions,
  GraphQlRequest,
  Web3Request,
  Processor,
  RequestType,
  ProcessRequest
} from "./types";

export type ProcessorRunner<C extends Collections> = <
  A extends unknown[],
  T = any,
  R extends RequestType<C> | undefined = undefined
>(
  processor: Processor<C, A, T, R>,
  ...args: A
) => Promise<T>;

export const runForDefinitions = <C extends Collections>(
  _definitions: Definitions<C> // this is only used for type inference
) => (
  db: Db<C>
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
    run(processor, ...args) {
      return run(connections, processor, ...args);
    },

    forProvider(provider) {
      const connections = {
        db,
        provider
      };

      return {
        run: (processor, ...args) => run(connections, processor, ...args)
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
  connections: { db: Db<C>; provider?: Provider },
  processor: Processor<C, Args, Return, R>,
  ...args: Args
) => {
  const saga = processor(...args);
  let current = saga.next();

  while (!current.done) {
    const loadRequest = current.value as ProcessRequest<C, R>;
    switch (loadRequest.type) {
      case "graphql": {
        const { db } = connections;
        const { request, variables } = loadRequest as GraphQlRequest;
        const response = await db.execute(request, variables);

        // @ts-ignore
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
          id: new Date().getTime(),
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
