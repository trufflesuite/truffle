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

it("queries contract names", async () => {
  const workspace = new PouchConnector();

  const result = await graphql(schema, GetContractNames, null, { workspace });
  expect(result).toHaveProperty("data");

  const { data } = result;
  expect(data).toHaveProperty("contractNames");

  const { contractNames } = data;
  expect(contractNames).toEqual([]);
});

const AddContractName = `
mutation AddContractName {
  addContractName(name: "Migrations")
}`;

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

const AddContractType = `
mutation AddContractType($name: String!, $abi: String!, $createBytecode: ID) {
  addContractType(name: $name, abi: $abi, createBytecode: $createBytecode)
}`;

const GetContractType = `
query GetContractType($name: String!) {
  contractType(name: $name) {
    name
    abi {
      json
    }
    createBytecode {
      bytes
    }
  }
}`;

it("stores and retrieves aggregated contract type with bytecode", async () => {
  const workspace = new PouchConnector();
  const variables = {
    name: Migrations.contractName,
    abi: JSON.stringify(Migrations.abi),
    bytecodeId: soliditySha3(Migrations.bytecode),
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
    expect(addBytecode).toEqual(variables.bytecodeId);
  }

  // add contract type
  {
    const result = await graphql(
      schema, AddContractType, null, { workspace }, {
        name: variables.name,
        abi: variables.abi,
        createBytecode: variables.bytecodeId
      }
    );

    const { data } = result;
    expect(data).toHaveProperty("addContractType");

    const { addContractType } = data;
    expect(addContractType).toEqual(variables.name);
  }

  // ensure retrieved as matching
  {
    const result = await graphql(schema, GetContractType, null, { workspace }, {
      name: variables.name
    });

    const { data } = result;
    expect(data).toHaveProperty("contractType");

    const { contractType } = data;
    expect(contractType).toHaveProperty("name");
    expect(contractType).toHaveProperty("abi");
    expect(contractType).toHaveProperty("createBytecode");

    const { name, abi, createBytecode } = contractType;
    expect(name).toEqual(variables.name);
    expect(abi).toHaveProperty("json");
    expect(createBytecode).toHaveProperty("bytes");

    const { json } = abi;
    expect(json).toEqual(variables.abi);

    const { bytes } = createBytecode;
    expect(bytes).toEqual(variables.bytes);

  }
});
