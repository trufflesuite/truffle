import fs from "fs";
import path from "path";
import gql from "graphql-tag";
import { TruffleDB } from "truffle-db";
import { ArtifactsLoader } from "truffle-db/loaders/artifacts";
import { generateId } from "truffle-db/helpers";
import * as Contracts from "truffle-workflow-compile";

// mocking the truffle-workflow-compile to avoid jest timing issues
// and also to keep from adding more time to Travis testing
jest.mock("truffle-workflow-compile", () => ({
 compile: function(config, callback) {
   const compilationData = require(path.join(__dirname, "build", "SimpleStorage.json"));
   callback(null, {
     "contracts": [{
         "contract_name": "SimpleStorage",
         ...compilationData
         }]
     });
 }
}));

const fixturesDirectory = path.join(__dirname, "sources");

// minimal config
const config = {
  contracts_build_directory: fixturesDirectory
};

const compilationConfig =  {
    contracts_directory: path.join(__dirname, "compilationSources"),
    contracts_build_directory: path.join(__dirname, "build"), 
    all: true
} 

const db = new TruffleDB(config);
const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));
const Build = require(path.join(__dirname, "build", "SimpleStorage.json"));

const GetWorkspaceBytecode: boolean = gql`
query GetWorkspaceBytecode($id: ID!) {
  workspace {
    bytecode(id: $id) {
      id
      bytes
    }
  }
}`;

describe("Bytecodes", () => {
  it("loads create bytecodes", async () => {
    // arrange
    const expectedId = generateId({ bytes: Migrations.bytecode });
    const loader = new ArtifactsLoader(db);

    // act
    await loader.load();

    // assert
    const {
      data: {
        workspace: {
          bytecode: {
            bytes
          }
        }
      }
    } = await db.query(GetWorkspaceBytecode, { id: expectedId });

    expect(bytes).toEqual(Migrations.bytecode);
  });
});


const GetWorkspaceSource: boolean = gql`
query GetWorkspaceSource($id: ID!) {
  workspace {
    source(id: $id) {
      id
      contents
    }
  }
}`;


describe("Sources", () => {
  it("loads contract sources", async () => {
    // arrange
    const expectedId = generateId({
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    });
    const loader = new ArtifactsLoader(db);

    // act
    await loader.load();

    // assert
    const {
      data: {
        workspace: {
          source: {
            contents
          }
        }
      }
    } = await db.query(GetWorkspaceSource, { id: expectedId });

    expect(contents).toEqual(Migrations.source);
  });
});

const GetWorkspaceCompilation: boolean = gql`
query getWorkspaceCompilation($id: ID!) {
  workspace {
    compilation(id: $id) {
      compiler {
        name
        version
      }
      contracts {
        name
        source {
          contents
          sourcePath
        }
        ast {
          json
        }
      }
      sources {
        contents
        sourcePath
      }
    }
  }
}`;

describe("Compilation", () => {
  it("loads compilations", async () => {
    //arrange
    const sourceId = generateId({
      contents: Build.source,
      sourcePath: Build.sourcePath
    });
    const expectedId = generateId({
      compiler: Build.compiler, 
      sourceIds: [{ id: sourceId }]
    });
    const loader = new ArtifactsLoader(db, compilationConfig);

    //act
    await loader.load();

    const {
      data: {
        workspace: {
          compilation: {
            compiler: {
              version
            },
            sources,
            contracts
          }
        }
      }
    } = await db.query(GetWorkspaceCompilation, { id: expectedId });

    expect(version).toEqual(Build.compiler.version);
    expect(sources[0].contents).toEqual(Build.source);
    expect(contracts[0].name).toEqual(Build.contractName);
  })
});
