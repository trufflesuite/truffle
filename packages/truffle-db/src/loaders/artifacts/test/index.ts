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
   const magicSquare= require(path.join(__dirname, "sources", "MagicSquare.json"));
   const migrations = require(path.join(__dirname, "sources", "Migrations.json"));
   const squareLib = require(path.join(__dirname, "sources", "SquareLib.json"));
   callback(null, {
     "contracts": [{
       "contract_name": "MagicSquare",
       ...magicSquare
     },
     {
       "contract_name": "Migrations",
       ...migrations
     },
     {
       "contract_name": "SquareLib",
       ...squareLib
     }
     ]
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
    contracts_build_directory: path.join(__dirname, "sources"),
    all: true
}

const db = new TruffleDB(config);
const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));
const Build = [require(path.join(__dirname, "sources", "MagicSquare.json")), require(path.join(__dirname, "sources", "Migrations.json")), require(path.join(__dirname, "sources", "SquareLib.json")) ];

const GetWorkspaceBytecode: boolean = gql`
query GetWorkspaceBytecode($id: ID!) {
  workspace {
    bytecode(id: $id) {
      id
      bytes
    }
  }
}`;

const GetWorkspaceSource: boolean = gql`
query GetWorkspaceSource($id: ID!) {
  workspace {
    source(id: $id) {
      id
      contents
      sourcePath
    }
  }
}`;

const GetWorkspaceContract = gql`
query GetWorkspaceContract($id:ID!){
  workspace {
    contract(id:$id) {
      id
      name
      abi {
        json
      }
      constructor {
        createBytecode {
          bytes
        }
      }
      sourceContract {
        source {
          contents
          sourcePath
        }
        ast {
          json
        }
        source {
          contents
          sourcePath
        }
      }
      compilation {
        compiler {
          name
          version
        }
        sources {
          contents
          sourcePath
        }
        contracts {
          name
          source {
            contents
            sourcePath
          }
        }
      }
    }
  }
}`;

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
        id
        contents
        sourcePath
      }
    }
  }
}`;

describe("Compilation", () => {
  it("loads compilations", async () => {
    //arrange
    let sourceIds = [];
    for(let contract in Build) {
      let sourceId = generateId({
        contents: Build[contract]["source"],
        sourcePath: Build[contract]["sourcePath"]
      });
      sourceIds.push({id: sourceId});
    }
    const expectedId = generateId({
      compiler: Build[0].compiler,
      sourceIds: sourceIds
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

    expect(version).toEqual(Build[0].compiler.version);
    expect(sources.length).toEqual(3);
    for(let source in sources) {
      expect(sources[source]["id"]).toEqual(sourceIds[source]["id"]);
      expect(sources[source].contents).toEqual(Build[source].source);
      expect(contracts[source].name).toEqual(Build[source].contractName);
    }

  })
});
