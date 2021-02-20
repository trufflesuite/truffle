import { useState, useEffect } from "react";
import TruffleConfig from "@truffle/config";

import type { Db, Resources } from "@truffle/db";
import { queryCompilation, fetchExternal } from "@truffle/db-kit/utils";

export interface UseCompilationsOptions {
  config: TruffleConfig;
  db: Db;
  project: Resources.IdObject<"projects">;
  network: Pick<Resources.Input<"networks">, "name">;
  addresses: string[];
}

type Compilation = Resources.Resource<"compilations">;

export enum Status {
  Querying = "querying",
  Fetching = "fetching",
  Ok = "ok",
  Failed = "failed"
}

export interface AddressInfo {
  address: string;
  status: Status;
}

export interface CompilationsInfo {
  done: boolean;
  compilations: Compilation[] | undefined;
  statusByAddress: {
    [address: string]: Status;
  };
}

export function useCompilations({
  config,
  db,
  project,
  network,
  addresses
}: UseCompilationsOptions): CompilationsInfo {
  const statusByAddress: { [address: string]: Status } = {};
  const sparseCompilations: (Compilation | undefined)[] = [];

  for (const address of addresses) {
    const [status, setStatus] = useState<Status>(Status.Querying);
    const [needsQuery, setNeedsQuery] = useState<boolean>(true);
    const [needsFetch, setNeedsFetch] = useState<boolean>(false);
    const [hasFetched, setHasFetched] = useState<boolean>(false);
    const [compilation, setCompilation] = useState<Compilation | undefined>();

    statusByAddress[address] = status;
    sparseCompilations.push(compilation);

    useEffect(() => {
      if (needsQuery) {
        setStatus(Status.Querying);
        setNeedsQuery(false);
        queryCompilation({ db, project, network, address }).then(
          compilation => {
            if (compilation) {
              setCompilation(compilation);
              setStatus(Status.Ok);
            } else if (!hasFetched) {
              setNeedsFetch(true);
            } else {
              setStatus(Status.Failed);
            }
          }
        );
      }
    }, [needsQuery]);

    useEffect(() => {
      if (needsFetch) {
        setStatus(Status.Fetching);
        setNeedsFetch(false);
        fetchExternal({ config, project, address })
          .then(() => {
            setHasFetched(true);
            setNeedsQuery(true);
          })
          .catch(() => {
            setHasFetched(true);
            setStatus(Status.Failed);
          });
      }
    }, [needsFetch]);
  }

  const done = !Object.values(statusByAddress).find(status =>
    [Status.Querying, Status.Fetching].includes(status)
  );

  const compilations = done
    ? Object.values(
        sparseCompilations
          .filter(
            (compilation): compilation is Resources.Resource<"compilations"> =>
              !!compilation
          )
          .reduce(
            (byId, compilation) => ({
              ...byId,
              [compilation.id]: compilation
            }),
            {}
          )
      )
    : undefined;

  return {
    done,
    compilations,
    statusByAddress
  };
}
