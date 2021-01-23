import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networkGenealogies:test:setup");

import { connect, Project } from "@truffle/db";

export const setupProjectForTest = async (options: {
  identifier: string;
}) => {
  // @ts-ignore
  const db = connect({
    working_directory: options.identifier,
    db: {
      adapter: {
        name: "memory"
      }
    }
  });

  const project = await Project.initialize({
    project: {
      directory: options.identifier
    },
    db
  });

  return {
    db,
    project
  }
}
