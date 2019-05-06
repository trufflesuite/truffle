import fs from "fs";
import path from "path";
import gql from "graphql-tag";
import { TruffleDB } from "truffle-db";
import { ArtifactsLoader } from "truffle-db/loaders/artifacts";
import * as Contracts from "truffle-workflow-compile";

import { generateId } from "test/helpers";

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

let loader;
beforeEach(()=> {
 loader = new ArtifactsLoader(db, compilationConfig);
});

describe("Bytecodes", () => {
  it("loads create bytecodes", async () => {
    // arrange
    const expectedId = generateId({ bytes: Migrations.bytecode });

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

const GetWorkspaceCompilation = gql`
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
        sources {
          contents
          sourcePath
        }
      }
      sources {
        contents
        sourcePath
      }
    }
  }
}
`;

describe("Compilation", () => {
  it("loads compilations", async () => {
    //arrange
    const expectedId = generateId({
      compiler: Build.compiler, 
      sourceIds: [{
        id: generateId({
          contents: Build.source, 
          sourcePath: Build.sourcePath
        })
      }]
    });
    
    //act
    await loader.load().then(async () => {

    //assert  
    const {
      data: {
        workspace: {
          compilation: {
            compiler: {
              version
            },
            sources: [{
              contents, 
              sourcePath
            }], 
            contracts: [{
              name,
              source, 
              ast
            }]
          }
        }
      }
    } = await db.query(GetWorkspaceCompilation, { id: expectedId });

    expect(version).toEqual(Build.compiler.version);
    expect(contents).toEqual(Build.source);
    expect(name).toEqual(Build.contractName);
    });
  })
});
