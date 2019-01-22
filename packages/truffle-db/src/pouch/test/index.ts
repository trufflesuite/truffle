import { graphql } from "graphql";

import { PouchConnector, schema } from "truffle-db/pouch";

const GetContractNames = `
query GetContractNames {
  contractNames
}`;

const AddContractName = `
mutation AddContractName {
  addContractName(name: "Migrations")
}`;

it("queries contract names", async () => {
  const workspace = new PouchConnector();

  const result = await graphql(schema, GetContractNames, null, { workspace });
  expect(result).toHaveProperty("data");

  const { data } = result;
  expect(data).toHaveProperty("contractNames");

  const { contractNames } = data;
  expect(contractNames).toEqual([]);
});

it("adds a contract name", async () => {
  const workspace = new PouchConnector();

  // perform add
  {
    const result = await graphql(schema, AddContractName, null, { workspace });
    expect(result).toHaveProperty("data");

    const { data } = result;
    expect(data).toHaveProperty("addContractName");
  }

  // check result
  {
    const result = await graphql(schema, GetContractNames, null, { workspace });
    expect(result).toHaveProperty("data");

    const { data } = result;
    expect(data).toHaveProperty("contractNames");

    const { contractNames } = data;
    expect(contractNames).toEqual(["Migrations"]);
  }
});
