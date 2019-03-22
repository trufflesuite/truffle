import fs from "fs";
import path from "path";

import { TruffleDB } from "truffle-db";

const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/test
  "..", // truffle-db/src/
  "..", // truffle-db/
  "test",
  "fixtures"
);

// minimal config
const config = {
  contracts_build_directory: fixturesDirectory
};

const db = new TruffleDB(config);
const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

const GetContractNames = `
query GetContractNames {
  artifacts {
    contractNames
  }
}
`;

const GetNameAndABI = `
query GetNameAndABI($name:String!) {
  artifacts {
    contract(name:$name) {
      name
      source {
        contents
        sourcePath
      }
    }
  }
}`;

it("lists artifact contract names", async () => {
  const result = await db.query(GetContractNames);
  expect(result).toHaveProperty("data");

  const { data } = result;
  expect(data).toHaveProperty("artifacts");

  const { artifacts } = data;
  expect(artifacts).toHaveProperty("contractNames");

  const { contractNames } = artifacts;
  expect(contractNames).toContain("Migrations");
});

it("retrieves name and ABI correctly", async () => {
  const result = await db.query(GetNameAndABI, {
    name: Migrations.contractName
  });

  console.debug(JSON.stringify(result));

  const { data } = result;
  expect(data).toHaveProperty("artifacts");

  const { artifacts } = data;
  expect(artifacts).toHaveProperty("contract");

  const { contract } = artifacts;
  expect(contract).toHaveProperty("name");
  expect(contract).toHaveProperty("source");

  const { name, source } = contract;
  expect(name).toEqual(Migrations.contractName);
  expect(source).toHaveProperty("contents");
  expect(source).toHaveProperty("sourcePath");
});
