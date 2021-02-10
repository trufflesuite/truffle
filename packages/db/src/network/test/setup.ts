import { logger } from "@truffle/db/logger";
const debug = logger("db:network:test:setup");

import { connect } from "@truffle/db";

export const setup = async (options: {
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

  return db;
}
