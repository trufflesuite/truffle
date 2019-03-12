import path from "path";

import { graphql } from "graphql";
import { soliditySha3 } from "web3-utils";

import { Workspace, schema } from "truffle-db/workspace";

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
  const workspace = new Workspace();

  const result = await graphql(schema, GetContractNames, null, { workspace });
  expect(result).toHaveProperty("data");

  const { data } = result;
  expect(data).toHaveProperty("contractNames");

  const { contractNames } = data;
  expect(contractNames).toEqual([]);
});

const GetSource = `
query GetSource($id: ID!) {
  source(id: $id) {
    id
    contents
    sourcePath
  }
}`;

const AddSource = `
mutation AddSource($contents: String!, $sourcePath: String) {
  sourcesAdd(input: {
    sources: [{
      contents: $contents,
      sourcePath: $sourcePath,
    }]
  }) {
    sources {
      id
    }
  }
}`;

it("adds source", async () => {
  const workspace = new Workspace();
  const variables = {
    contents: Migrations.source,
    sourcePath: Migrations.sourcePath,
    id: soliditySha3(Migrations.source, Migrations.sourcePath)
  }

  // add source
  {
    const result = await graphql(
      schema, AddSource, null, { workspace }, variables
    );

    const { data } = result;
    expect(data).toHaveProperty("sourcesAdd");

    const { sourcesAdd } = data;
    expect(sourcesAdd).toHaveProperty("sources");

    const { sources } = sourcesAdd;
    expect(sources).toHaveLength(1);

    const source = sources[0];
    expect(source).toHaveProperty("id");

    const { id } = source;
    expect(id).toEqual(variables.id);
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
query GetBytecode($id: ID!) {
  bytecode(id: $id) {
    id
    bytes
  }
}`;

const AddBytecode = `
mutation AddBytecode($bytes: Bytes!) {
  bytecodesAdd(input: {
    bytecodes: [{
      bytes: $bytes
    }]
  }) {
    bytecodes {
      id
    }
  }
}`;

it("adds bytecode", async () => {
  const workspace = new Workspace();
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
    expect(data).toHaveProperty("bytecodesAdd");

    const { bytecodesAdd } = data;
    expect(bytecodesAdd).toHaveProperty("bytecodes");

    const { bytecodes } = bytecodesAdd;
    expect(bytecodes).toHaveLength(1);

    const bytecode = bytecodes[0];
    expect(bytecode).toHaveProperty("id");

    const { id } = bytecode;
    expect(id).toEqual(variables.id);
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

const GetContract = `
query getContract($id:ID!){
    contract(id:$id) {
      name
      source {
        contents
      }
    }
}`

const AddContracts = `
mutation addContracts($contractName: String, $sourceId: ID!) {
  contractsAdd(input: {
    contracts: [{
      name: $contractName
      source: {
        id: $sourceId
      }
    }]
  }) {
    contracts {
      id
      name
      source {
        id
      }
    }
  }
}`

it("adds contracts", async () => {
  const workspace = new Workspace();
  const id = soliditySha3(Migrations.contractName, soliditySha3(Migrations.source, Migrations.sourcePath))
  
  const variables = {
    contractName: Migrations.contractName,
    sourceId: soliditySha3(Migrations.source, Migrations.sourcePath),
    id: id
  }

  // add contracts
  {
    const result = await graphql(
      schema, AddContracts, null, { workspace }, variables
    );
    const { data } = result;
    expect(data).toHaveProperty("contractsAdd");

    const { contractsAdd } = data;
    expect(contractsAdd).toHaveProperty("contracts");

    const { contracts } = contractsAdd;
    expect(contracts).toHaveLength(1);

    const contract = contracts[0];
    expect(contract).toHaveProperty("id");
    expect(contract).toHaveProperty("name");
    expect(contract).toHaveProperty("source");

    const { id } = contract;
    expect(id).toEqual(variables.id);
  }

  // ensure retrieved as matching
  {
    const result = await graphql(schema, GetContract, null, { workspace }, { id: variables.id });
    const { data } = result;
    expect(data).toHaveProperty("contract");

    const { contract } = data;
    expect(contract).toHaveProperty("name");
    expect(contract).toHaveProperty("source");
  

    const { name, source } = contract;
    expect(name).toEqual(variables.contractName);
    expect(source.contents).toEqual(Migrations.source);
  }
});