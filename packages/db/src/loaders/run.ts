import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:run");

import { Loader, LoadRequest, GraphQlRequest, Web3Request, RequestType } from "./types";

export type LoaderRunner = <
  A extends unknown[],
  T = any,
  R extends RequestType | undefined = undefined
>(
  loader: Loader<A, T, R>,
  ...args: A
) => Promise<T>;

export const forDb = (db): LoaderRunner => async <
  Args extends unknown[],
  Return,
  R extends RequestType | undefined
>(
  loader: Loader<Args, Return, R>,
  ...args: Args
) => {
  const saga = loader(...args);
  let current = saga.next();

  while (!current.done) {
    const loadRequest = current.value as LoadRequest<R>;
    switch (loadRequest.type) {
      case "graphql":
        const { request, variables } = loadRequest as GraphQlRequest;
        const response = await db.query(request, variables);

        current = saga.next(response);

        break;
      default:
        throw new Error(`Unknown request type ${loadRequest.type}`);
    }
  }

  return current.value;
};
