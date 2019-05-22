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
    const returnValue = {
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
    }
    return returnValue;
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
  let sourceIds= [];
  let bytecodeIds = [];
  let expectedCompilationId;
  beforeAll(async () => {
    for(let contract in Build) {
      let sourceId = generateId({
        contents: Build[contract]["source"],
        sourcePath: Build[contract]["sourcePath"]
      });
      sourceIds.push({id: sourceId});

      let bytecodeId = generateId({
        bytes: Build[contract]["bytecode"]
      });
      bytecodeIds.push({ id: bytecodeId });
    }

    expectedCompilationId = generateId({
      compiler: Build[0].compiler,
      sourceIds: sourceIds
    });

    const loader = new ArtifactsLoader(db, compilationConfig);
    await loader.load();
  })

  it("loads compilations", async () => {
    const expectedId = generateId({
      compiler: Build[0].compiler,
      sourceIds: sourceIds
    });

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
    } = await db.query(GetWorkspaceCompilation, { id: expectedCompilationId });

    expect(version).toEqual(Build[0].compiler.version);
    expect(sources.length).toEqual(3);
    for(let source in sources) {
      expect(sources[source]["id"]).toEqual(sourceIds[source]["id"]);
      expect(sources[source].contents).toEqual(Build[source].source);
      expect(contracts[source].name).toEqual(Build[source].contractName);
    }

  });

  it("loads contract sources", async () => {
    for(let index in sourceIds) {
      let {
        data: {
          workspace: {
            source: {
              contents,
              sourcePath
            }
          }
        }
      } = await db.query(GetWorkspaceSource, sourceIds[index]);

      expect(contents).toEqual(Build[index].source);
      expect(sourcePath).toEqual(Build[index].sourcePath);
    }
  });

  it("loads bytecodes", async () => {
    for(let index in bytecodeIds) {
      let {
        data: {
          workspace: {
            bytecode: {
              bytes
            }
          }
        }
      } = await db.query(GetWorkspaceBytecode, bytecodeIds[index]);

      expect(bytes).toEqual(Build[index].bytecode);

    }
  });

  it("loads contracts", async() => {
    let contractIds = [];
    for(let index in Build) {
      let expectedId = generateId({
        name: Build[index].contractName,
        abi: { json: JSON.stringify(Build[index].abi) },
        sourceContract: { index: +index },
        compilation: { id: expectedCompilationId }
      });

      contractIds.push({ id: expectedId });
      let {
        data: {
          workspace: {
            contract: {
              id,
              name,
              abi: {
                json
              },
              constructor: {
                createBytecode: {
                  bytes
                }
              },
              sourceContract: {
                source: {
                  contents,
                  sourcePath
                },
                ast
              },
              compilation: {
                compiler: {
                  version
                },
                sources,
                contracts
              }
            }
          }
        }
      } = await db.query(GetWorkspaceContract, contractIds[index]);

      expect(name).toEqual(Build[index].contractName);
      expect(bytes).toEqual(Build[index].bytecode);
      expect(contents).toEqual(Build[index].source);
      expect(ast.json).toEqual(JSON.stringify(Build[index].ast));
      expect(version).toEqual(Build[index].compiler.version);
      expect(id).toEqual(contractIds[index].id);
    }
  });
});
