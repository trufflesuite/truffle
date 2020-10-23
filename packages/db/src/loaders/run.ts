import { WorkspaceRequest, WorkspaceResponse } from "./types";

export type LoaderRunner = <
  Request extends WorkspaceRequest,
  Response extends WorkspaceResponse,
  Args extends unknown[],
  Return
>(
  loader: (...args: Args) => Generator<Request, Return, Response>,
  ...args: Args
) => Promise<Return>;

export const forDb = (db): LoaderRunner => async <
  Request extends WorkspaceRequest,
  Response extends WorkspaceResponse,
  Args extends unknown[],
  Return
>(
  loader: (...args: Args) => Generator<Request, Return, Response>,
  ...args: Args
): Promise<Return> => {
  const saga = loader(...args);
  let current = saga.next();

  while (!current.done) {
    const { request, variables } = current.value as Request;

    const response = await db.query(request, variables);

    current = saga.next(response);
  }

  return current.value;
};
