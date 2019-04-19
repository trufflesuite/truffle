import path from "path";

import gql from "graphql-tag";
import * as graphql from "graphql";
import { soliditySha3 } from "web3-utils";

import { Workspace, schema } from "truffle-db/workspace";


const jsonStableStringify = require('json-stable-stringify');

const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/db/test
  "..", // truffle-db/src/db
  "..", // truffle-db/src/
  "..", // truffle-db/
  "test",
  "fixtures"
);

class WorkspaceClient {
  private workspace: Workspace;

  constructor () {
    this.workspace = new Workspace();
  }

  async execute (request, variables = {}) {
    const result = await graphql.execute(
      schema,
      request,
      null, // root object, managed by workspace
      { workspace: this.workspace }, // context vars
      variables
    );

    return result.data;
  }
}

const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

const generateId = (obj) => soliditySha3(jsonStableStringify(obj));

/*
 * root
 */

const GetContractNames = gql`
query GetContractNames {
  contractNames
}`;

describe("ContractNames", () => {
  it("queries contract names", async () => {
    const client = new WorkspaceClient();

    const data = await client.execute(GetContractNames);
    expect(data).toHaveProperty("contractNames");

    const { contractNames } = data;
    expect(contractNames).toEqual([]);
  });
})

/*
 * Source
 */

const GetSource = gql`
query GetSource($id: ID!) {
  source(id: $id) {
    id
    contents
    sourcePath
  }
}`;

const AddSource = gql`
mutation AddSource($contents: String!, $sourcePath: String) {
  sourcesAdd(input: {
    sources: [
    {
      contents: $contents,
      sourcePath: $sourcePath,
    }]
  }) {
    sources {
      id
    }
  }
}`;

describe("Source", () => {
  it("adds source", async () => {
    const client = new WorkspaceClient();

    const expectedId = generateId({
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    })
    const variables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath,
    }

    // add source
    {
      const data = await client.execute(AddSource, variables);
      expect(data).toHaveProperty("sourcesAdd");

      const { sourcesAdd } = data;
      expect(sourcesAdd).toHaveProperty("sources");

      const { sources } = sourcesAdd;
      expect(sources).toHaveLength(1);

      const source = sources[0];
      expect(source).toHaveProperty("id");

      const { id } = source;
      expect(id).toEqual(expectedId);
    }

    // ensure retrieved as matching
    {
      const data = await client.execute(GetSource, { id: expectedId });
      expect(data).toHaveProperty("source");

      const { source } = data;
      expect(source).toHaveProperty("id");
      expect(source).toHaveProperty("contents");
      expect(source).toHaveProperty("sourcePath");

      const { id, contents, sourcePath } = source;
      expect(id).toEqual(expectedId)
      expect(contents).toEqual(variables.contents);
      expect(sourcePath).toEqual(variables.sourcePath);
    }
  });
});

/*
 * Bytecode
 */
const GetBytecode = gql`
query GetBytecode($id: ID!) {
  bytecode(id: $id) {
    id
    bytes
  }
}`;

const AddBytecode = gql`
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

describe("Bytecode", () => {
  it("adds bytecode", async () => {
    const client = new WorkspaceClient();

    const expectedId = generateId({ bytes: Migrations.bytecode })

    const variables = {
      bytes: Migrations.bytecode
    }

    // add bytecode
    {
      const data = await client.execute(AddBytecode, { bytes: variables.bytes });
      expect(data).toHaveProperty("bytecodesAdd");

      const { bytecodesAdd } = data;
      expect(bytecodesAdd).toHaveProperty("bytecodes");

      const { bytecodes } = bytecodesAdd;
      expect(bytecodes).toHaveLength(1);

      const bytecode = bytecodes[0];
      expect(bytecode).toHaveProperty("id");

      const { id } = bytecode;
      expect(id).toEqual(expectedId);
    }

    // ensure retrieved as matching
    {
      const data = await client.execute(GetBytecode, { id: expectedId });
      expect(data).toHaveProperty("bytecode");

      const { bytecode } = data;
      expect(bytecode).toHaveProperty("id");
      expect(bytecode).toHaveProperty("bytes");

      const { id, bytes } = bytecode;
      expect(id).toEqual(expectedId);
      expect(bytes).toEqual(variables.bytes);
    }
  });
});

/*
 * Compilation
 */

const GetCompilation = gql`
query GetCompilation($id: ID!) {
  compilation(id: $id) {
    id
    compiler {
      name
      version
    }
    sources {
      id
      contents
    }
    contracts {
      source {
        contents
      }
    }
  }
}`;

const AddCompilation = gql`
mutation AddCompilation($compilerName: String!, $compilerVersion: String!, $sourceId: ID!, $abi:String!) {
  compilationsAdd(input: {
    compilations: [{
      compiler: {
        name: $compilerName
        version: $compilerVersion
      }
      contracts: [
      {
        name:"testing",
        ast: {
          json: $abi
        }
        source: {
          id: $sourceId
        }
      }]
      sources: [
        {
         id: $sourceId
        }
      ]
    }]
  }) {
    compilations {
      id
      compiler {
        name
      }
      sources {
        contents
      }
      contracts {
        source {
          contents
          sourcePath
        }
        ast {
          json
        }
        name
      }
    }
  }
}`

describe("Compilation", () => {
  const client = new WorkspaceClient();

  let sourceId;
  
  beforeEach(async () => {
    //add source and get id
    const sourceVariables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    }
    const sourceResult = await client.execute(AddSource, sourceVariables);
    sourceId = sourceResult.sourcesAdd.sources[0].id;
  })

  it("adds compilation", async () => {
    const expectedId = generateId({ 
      compiler: Migrations.compiler, 
      sourceIds: [{ id: sourceId }] 
    })

    const variables = {
      compilerName: Migrations.compiler.name,
      compilerVersion: Migrations.compiler.version,
      sourceId: sourceId,
      abi: JSON.stringify(Migrations.abi)
    }

  // add compilation
    {
      const data = await client.execute(AddCompilation, variables);
      expect(data).toHaveProperty("compilationsAdd");

      const { compilationsAdd } = data;
      expect(compilationsAdd).toHaveProperty("compilations");

      const { compilations } = compilationsAdd;
      expect(compilations).toHaveLength(1);

      for (let compilation of compilations) {
        expect(compilation).toHaveProperty("compiler");
        expect(compilation).toHaveProperty("sources");
        const { compiler, sources, contracts } = compilation;

        expect(compiler).toHaveProperty("name");

        expect(sources).toHaveLength(1);
        for (let source of sources) {
          expect(source).toHaveProperty("contents");
        }

        expect(contracts).toHaveLength(1);

        for(let contract of contracts) {
          expect(contract).toHaveProperty("source");
          expect(contract).toHaveProperty("name");
          expect(contract).toHaveProperty("ast");
        }
      }
    }
      //ensure retrieved as matching
    {
      const data = await client.execute(GetCompilation, { id: expectedId });
      expect(data).toHaveProperty("compilation");

      const { compilation } = data;
      expect(compilation).toHaveProperty("id");
      expect(compilation).toHaveProperty("compiler");
      expect(compilation).toHaveProperty("sources");

      const { sources } = compilation;

      for (let source of sources) {
        expect(source).toHaveProperty("id");
        const { id } = source;
        expect(id).not.toBeNull();

        expect(source).toHaveProperty("contents");
        const { contents } = source;
        expect(contents).not.toBeNull();
      }
    }
  });
});

/*
 * Contract
 */

const GetContract = gql`
query getContract($id:ID!){
    contract(id:$id) {
      name
      abi {
        json
      }
      sourceContract {
        source {
          contents
        }
        ast {
          json
        }
      }
    }
}`

const AddContracts = gql`
mutation addContracts($contractName: String, $compilationId: ID!, $bytecodeId:ID!, $abi:String!) {
  contractsAdd(input: {
    contracts: [{
      name: $contractName
      abi: {
        json: $abi
      }
      compilation: {
        id: $compilationId
      }
      sourceContract: {
        index: 0
      }
      constructor: {
        createBytecode: {
          id: $bytecodeId
        }
      }
    }]
  }) {
    contracts {
      id
      name
      sourceContract {
        name
        source {
          contents
        }
        ast {
          json
        }
      }
      constructor {
        createBytecode {
          bytes
        }
      }
    }
  }
}`

describe("Contract", () => {
  const client = new WorkspaceClient();

  let compilationId;
  let sourceId;
  let bytecodeId;
  let expectedId;

  beforeEach(async () => {
    //add source and get id
    const sourceVariables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    }
    const sourceResult = await client.execute(AddSource, sourceVariables);
    sourceId = sourceResult.sourcesAdd.sources[0].id;

    //add bytecode and get id 
    const bytecodeVariables = {
      bytes: Migrations.bytecode
    }
    const bytecodeResult = await client.execute(AddBytecode, bytecodeVariables);
    bytecodeId = bytecodeResult.bytecodesAdd.bytecodes[0].id

    // add compilation and get id
    const compilationVariables = {
      compilerName: Migrations.compiler.name,
      compilerVersion: Migrations.compiler.version,
      sourceId: sourceId,
      abi: JSON.stringify(Migrations.abi)
    }
    const compilationResult = await client.execute(AddCompilation, compilationVariables);
    compilationId = compilationResult.compilationsAdd.compilations[0].id;

  });


  it("adds contracts", async () => {
    const client = new WorkspaceClient();

    const expectedId = generateId({ 
      name: Migrations.contractName, 
      abi: { json: JSON.stringify(Migrations.abi) } , 
      sourceContract: { index: 0 } ,
      compilation: { id: compilationId }
    });

    const variables = {
      contractName: Migrations.contractName,
      compilationId: compilationId,
      bytecodeId: bytecodeId, 
      abi: JSON.stringify(Migrations.abi)
    }

    // add contracts
    {
      const data = await client.execute(AddContracts, variables);

      expect(data).toHaveProperty("contractsAdd");

      const { contractsAdd } = data;
      expect(contractsAdd).toHaveProperty("contracts");

      const { contracts } = contractsAdd;
      expect(contracts).toHaveLength(1);

      const contract = contracts[0];
      
      expect(contract).toHaveProperty("id");
      expect(contract).toHaveProperty("name");
      expect(contract).toHaveProperty("sourceContract");

      const { sourceContract } = contract;
      expect(sourceContract).toHaveProperty("name");
      expect(sourceContract).toHaveProperty("source");
      expect(sourceContract).toHaveProperty("ast");
    }

    //ensure retrieved as matching
    {
      const data = await client.execute(GetContract, { id: expectedId });

      expect(data).toHaveProperty("contract");

      const { contract } = data;
      expect(contract).toHaveProperty("name");
      expect(contract).toHaveProperty("sourceContract");
      expect(contract).toHaveProperty("abi");
    }
  });
});
