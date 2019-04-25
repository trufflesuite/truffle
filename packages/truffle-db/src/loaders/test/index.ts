import fs from "fs";
import path from "path";

import { TruffleDB } from "truffle-db";

const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/test
  "..", // truffle-db/src/loaders/artifacts
  "..", // truffle-db/src/loaders/artifacts
  "..", // truffle-db/src
  "..", // truffle-db
  "test",
  "fixtures"
);

// minimal config
const config = {
  contracts_build_directory: fixturesDirectory
};

const db = new TruffleDB(config);

console.debug("db in test " + JSON.stringify(db));
const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

const GetContractNames = `
query GetContractNames {
  artifactsLoader {
    contractNames
  }
}
`;

it("lists artifact contract names", async () => {
  const result = await db.query(GetContractNames);
  console.debug("in test " + JSON.stringify(result));
  expect(result).toHaveProperty("data");

  const { data } = result;
  expect(data).toHaveProperty("artifactsLoader");

  const { artifactsLoader } = data;
  expect(artifactsLoader).toHaveProperty("contractNames");

  const { contractNames } = artifactsLoader;
  expect(contractNames).toContain("Migrations");
});


const GetSource = `
query GetSource() {
  artifactsLoader {
    source {
      id
      contents
      sourcePath
    }
  }
}`;

it("gets source correctly ", async () => {
  const result = await db.query(GetSource);
console.debug("Result in getSource " + JSON.stringify(result));
  expect(result).toHaveProperty("data");
});
