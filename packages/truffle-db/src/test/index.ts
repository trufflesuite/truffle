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
    contractType(name:$name) {
      name
      abi {
        json
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

  const { data } = result;
  expect(data).toHaveProperty("artifacts");

  const { artifacts } = data;
  expect(artifacts).toHaveProperty("contractType");

  const { contractType } = artifacts;
  expect(contractType).toHaveProperty("name");
  expect(contractType).toHaveProperty("abi");

  const { name, abi } = contractType;
  expect(name).toEqual(Migrations.contractName);
  expect(abi).toHaveProperty("json");

  const { json } = abi;
  expect(json).toEqual(JSON.stringify(Migrations.abi));
});
