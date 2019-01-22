import path from "path";

import { graphql } from "graphql";
import { soliditySha3 } from "web3-utils";

import { PouchConnector, schema } from "truffle-db/pouch";
import { readInstructions } from "truffle-db/artifacts/bytecode";

const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/db/test
  "..", // truffle-db/src/db
  "..", // truffle-db/src/
  "..", // truffle-db/
  "test",
  "fixtures"
);

const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

const GetContractNames = `
query GetContractNames {
  contractNames
}`;

const AddContractName = `
mutation AddContractName {
  addContractName(name: "Migrations")
}`;

const GetSource = `
query GetSource($id: String!) {
  source(id: $id) {
    id
    contents
    sourcePath
  }
}`;

const AddSource = `
mutation AddSource($contents: String!, $sourcePath: String, $ast: AST) {
  addSource(contents: $contents, sourcePath: $sourcePath, ast: $ast)
}`;

const GetBytecode = `
query GetBytecode($id: String!) {
  bytecode(id: $id) {
    id
    bytes
  }
}`;

const AddBytecode = `
mutation AddBytecode($bytes: Bytes!) {
  addBytecode(bytes: $bytes)
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

it("adds source", async () => {
  const workspace = new PouchConnector();
  const variables = {
    contents: Migrations.source,
    sourcePath: Migrations.sourcePath,
    ast: Migrations.ast,
    id: soliditySha3(Migrations.source, Migrations.sourcePath)
  }

  // add source
  {
    const result = await graphql(
      schema, AddSource, null, { workspace }, variables
    );

    const { data } = result;
    expect(data).toHaveProperty("addSource");

    const { addSource } = data;
    expect(addSource).toEqual(variables.id);
  }

  // ensure retrieved as matching
  {
    const result = await graphql(schema, GetSource, null, { workspace }, {
      id: variables.id
    });

    const { data } = result;
    expect(data).toHaveProperty("source");

    const { source } = data;
    expect(source).toHaveProperty("id");
    expect(source).toHaveProperty("contents");
    expect(source).toHaveProperty("sourcePath");

    const { id, contents, sourcePath } = source;
    expect(id).toEqual(variables.id);
    expect(contents).toEqual(variables.contents);
    expect(sourcePath).toEqual(variables.sourcePath);
  }
});

it("adds bytecode", async () => {
  const workspace = new PouchConnector();
  const variables = {
    id: soliditySha3(Migrations.bytecode),
    bytes: Migrations.bytecode
  }

  // add bytecode
  {
    const result = await graphql(
      schema, AddBytecode, null, { workspace }, {
        bytes: variables.bytes
      }
    );

    const { data } = result;
    expect(data).toHaveProperty("addBytecode");

    const { addBytecode } = data;
    expect(addBytecode).toEqual(variables.id);
  }

  // ensure retrieved as matching
  {
    const result = await graphql(schema, GetBytecode, null, { workspace }, {
      id: variables.id
    });

    const { data } = result;
    expect(data).toHaveProperty("bytecode");

    const { bytecode } = data;
    expect(bytecode).toHaveProperty("id");
    expect(bytecode).toHaveProperty("bytes");

    const { id, bytes } = bytecode;
    expect(id).toEqual(variables.id);
    expect(bytes).toEqual(variables.bytes);
  }

});
