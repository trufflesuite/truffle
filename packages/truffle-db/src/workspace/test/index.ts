import path from "path";
import gql from "graphql-tag";
import * as graphql from "graphql";
import { Workspace, schema } from "truffle-db/workspace";
import { generateId } from "truffle-db/helpers";
import fse from "fse";
import tmp from "tmp";

const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/db/test
  "..", // truffle-db/src/db
  "..", // truffle-db/src/
  "..", // truffle-db/
  "test",
  "fixtures"
);

const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();

class WorkspaceClient {
  private workspace: Workspace;

  constructor () {
    this.workspace = new Workspace(tempDir.name);
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


/*
 * root
 */

const GetContractNames = gql`
query GetContractNames {
  contractNames
}`;

afterAll(() => {
  tempDir.removeCallback();
});

describe("ContractNames", () => {
  it("queries contract names", async () => {
    const client = new WorkspaceClient();

    const data = await client.execute(GetContractNames);
    expect(data).toHaveProperty("contractNames");

    const { contractNames } = data;
    const dirExists = await fse.exists(path.join(tempDir.name, ".db", "contract"));

    if(dirExists) {
     expect(contractNames).toEqual(["MagicSquare", "SquareLib", "Migrations", "VyperStorage", "Migrations"]);
    } else {
       expect(contractNames).toEqual([]);
    }

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

/*
 * Network
 */
const GetNetwork = gql`
query GetNetwork($id: ID!) {
  network(id: $id) {
    networkID
    id
  }
}`;

const AddNetworks = gql`
mutation AddNetworks($networkID: NetworkID!, $height: Int!, $hash: String!) {
  networksAdd(input: {
    networks: [{
      networkID: $networkID
      historicBlock: {
        height: $height
        hash: $hash
      }
    }]
  }) {
    networks {
      networkID
      id
    }
  }
}`;

describe("Network", () => {
  it("adds network", async () => {
    const client = new WorkspaceClient();
    const expectedId = generateId({
      networkID: Object.keys(Migrations.networks)[0],
      historicBlock: {
        height: 1,
        hash: '0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6'
      }
    })
    const variables = {
      networkID: Object.keys(Migrations.networks)[0],
      height: 1,
      hash: '0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6'
    }

    //add network
    {
      const data = await client.execute(AddNetworks,
        {
          networkID: variables.networkID,
          height: variables.height,
          hash: variables.hash
        }
      );

      expect(data).toHaveProperty("networksAdd");

      const { networksAdd } = data;
      expect(networksAdd).toHaveProperty("networks");

      const { networks } = networksAdd;
      expect(networks).toHaveLength(1);

      const network = networks[0];
      expect(network).toHaveProperty("id");

      const { id } = network;
      expect(id).toEqual(expectedId);
    }

    // // ensure retrieved as matching
    {
      const data = await client.execute(GetNetwork, { id: expectedId });
      expect(data).toHaveProperty("network");

      const { network } = data;
      expect(network).toHaveProperty("id");
      expect(network).toHaveProperty("networkID");

      const { id, networkID } = network;
      expect(id).toEqual(expectedId);
      expect(networkID).toEqual(variables.networkID);
    }
  });
});

/*
 * Contract Instance
 */
const GetContractInstance = gql`
query GetContractInstance($id: ID!) {
  contractInstance(id: $id) {
    address
    network {
      networkID
    }
  }
}`;

const AddContractInstances = gql`
mutation AddContractInstances($address: String!, $networkId: ID!) {
  contractInstancesAdd(input: {
    contractInstances: [{
      address: $address
      network: {
        id: $networkId
      }
    }]
  }) {
    contractInstances {
      address
      network {
        networkID
      }
    }
  }
}`;

describe("Contract Instance", () => {
  const client = new WorkspaceClient();
  let variables;
  let expectedId;
  let networkAdded;

  beforeEach(async () => {
    const network = {
      networkID: Object.keys(Migrations.networks)[0],
      historicBlock: {
        height: 1,
        hash: '0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6'
      }
    };
    const address = Object.values(Migrations.networks)[0]["address"];
    networkAdded = await client.execute(AddNetworks, {
      networkID: Object.keys(Migrations.networks)[0],
      height: 1,
      hash: '0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6'
    });
    expectedId = generateId({ address: address, network: { id: networkAdded.networksAdd.networks[0].id }})

    variables = {
      networkId: networkAdded.networksAdd.networks[0].id,
      address: address,
      contractId: generateId({
        name: Migrations.contractName,
        abi: { json: JSON.stringify(Migrations.abi) } ,
        sourceContract: { index: 0 } ,
        compilation: { id: "1234" }
      }),
      bytecodeId: generateId({ bytes: Migrations.bytecode })
    }
  });

  it("adds contract instance", async () => {
    //add network
    {
      const data = await client.execute(AddContractInstances, variables);
      expect(data).toHaveProperty("contractInstancesAdd");

      const { contractInstancesAdd } = data;
      expect(contractInstancesAdd).toHaveProperty("contractInstances");

      const { contractInstances } = contractInstancesAdd;
      expect(contractInstances[0]).toHaveProperty("address");
      expect(contractInstances[0]).toHaveProperty("network");

      const { address, network } = contractInstances[0];
      expect(address).toEqual(Object.values(Migrations.networks)[0]["address"]);
      expect(network).toHaveProperty("networkID");

      const { networkID } = network;
      expect(networkID).toEqual(Object.keys(Migrations.networks)[0]);
    }

    // // ensure retrieved as matching
    {
      const data = await client.execute(GetContractInstance, { id: expectedId });
      expect(data).toHaveProperty("contractInstance");

      const { contractInstance } = data;
      expect(contractInstance).toHaveProperty("address");
      expect(contractInstance).toHaveProperty("network");

      const { address, network } = contractInstance;
      expect(address).toEqual(variables.address);

      const { networkID } = network;
      expect(networkID).toEqual(networkAdded.networksAdd.networks[0].networkID);
    }
  });
});
