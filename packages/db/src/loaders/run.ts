import { Loader, LoadRequest, RequestName } from "./types";

export type LoaderRunner = <
  A extends unknown[],
  T = any,
  N extends RequestName | string = string
>(
  loader: Loader<A, T, N>,
  ...args: A
) => Promise<T>;

export const forDb = (db): LoaderRunner => async <
  Args extends unknown[],
  Return,
  N extends RequestName | string
>(
  loader: Loader<Args, Return, N>,
  ...args: Args
) => {
  const saga = loader(...args);
  let current = saga.next();

  while (!current.done) {
    const { request, variables } = current.value as LoadRequest<N>;

    const response = await db.query(request, variables);

    current = saga.next(response);
  }

  return current.value;
};
