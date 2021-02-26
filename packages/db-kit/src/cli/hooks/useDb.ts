import { useState, useEffect } from "react";
import TruffleConfig from "@truffle/config";

import { Db, connect, Project, Resources } from "@truffle/db";

export interface UseDbOptions {
  config: TruffleConfig | undefined;
}

export function useDb({
  config
}: UseDbOptions): {
  db: Db | undefined;
  project: Project.ConnectedProject | undefined;
  error: Error | undefined;
} {
  const [db, setDb] = useState<Db | undefined>();
  const [project, setProject] = useState<
    Resources.IdObject<"projects"> | undefined
  >();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (!config) {
      return;
    }

    if (!config.db?.enabled) {
      setError(new DbNotEnabledError());
      return;
    }

    const db = connect(config.db);
    setDb(db);

    Project.initialize({ db, project: { directory: config.working_directory } })
      .then(project => project.connect({ provider: config.provider }))
      .then(setProject)
      .catch(setError);
  }, [config]);

  return { db, project, error };
}

export class DbNotEnabledError extends Error {}
