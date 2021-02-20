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
} {
  const [db, setDb] = useState<Db | undefined>();
  const [project, setProject] = useState<
    Resources.IdObject<"projects"> | undefined
  >();

  useEffect(() => {
    if (!config) {
      return;
    }

    const db = connect(config.db);
    setDb(db);

    Project.initialize({ db, project: { directory: config.working_directory } })
      .then(project => project.connect({ provider: config.provider }))
      .then(setProject);
  }, [config]);

  return { db, project };
}
