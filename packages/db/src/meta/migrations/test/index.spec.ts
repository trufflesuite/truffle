import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:migrations:test");

export const testCases = [
  {
    versions: {
      workspace: "0.1.0",
      package: "0.2.0",
    },
    migrations: [
      { after: "0.2.0", name: "a" }
    ],
  }
]

describe("Migrations", () => {




});
