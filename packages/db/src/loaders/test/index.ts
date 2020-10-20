import path from "path";
import gql from "graphql-tag";
import { TruffleDB } from "@truffle/db";
import { ArtifactsLoader } from "@truffle/db/loaders/schema/artifactsLoader";
import { AddContracts } from "@truffle/db/loaders/resources/contracts";
import { AddNameRecords } from "@truffle/db/loaders/resources/nameRecords";
import {
  AddProjects,
  AssignProjectNames,
  ResolveProjectName
} from "@truffle/db/loaders/resources/projects";
import { generateId } from "@truffle/db/helpers";
import Migrate from "@truffle/migrate";
import { Environment } from "@truffle/environment";
import Config from "@truffle/config";
import Ganache from "ganache-core";
import Web3 from "web3";
import * as fse from "fs-extra";
import * as tmp from "tmp";
import { Shims } from "@truffle/compile-common";

let server;
const port = 8545;

beforeAll(async done => {
  server = Ganache.server();
  server.listen(port, done);
});

afterAll(async done => {
  tempDir.removeCallback();
  setTimeout(() => server.close(done), 500);
});

// mocking the truffle-workflow-compile to avoid jest timing issues
// and also to keep from adding more time to Travis testing
jest.mock("@truffle/workflow-compile", () => ({
  compile: function() {
    return require(path.join(
      __dirname,
      "workflowCompileOutputMock",
      "compilationOutput.json"
    ));
  }
}));

const fixturesDirectory = path.join(
  __dirname,
  "compilationSources",
  "build",
  "contracts"
);
const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();

// minimal config
const config = {
  contracts_build_directory: fixturesDirectory,
  working_directory: tempDir.name,
  db: {
    adapter: {
      name: "memory"
    }
  }
};

const compilationConfig = {
  contracts_directory: path.join(__dirname, "compilationSources"),
  contracts_build_directory: path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts"
  ),
  artifacts_directory: path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts"
  ),
  working_directory: tempDir.name,
  all: true
};

const migratedArtifacts = [
  require(path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts",
    "MagicSquare.json"
  )),
  require(path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts",
    "Migrations.json"
  )),
  require(path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts",
    "SquareLib.json"
  )),
  require(path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts",
    "VyperStorage.json"
  ))
];

const migrationFileNames = [
  "MagicSquare.json",
  "Migrations.json",
  "SquareLib.json",
  "VyperStorage.json"
];

const migrationConfig = Config.detect({
  workingDirectory: path.join(__dirname, "compilationSources")
});
migrationConfig.network = "development";

const db = new TruffleDB(config);

const artifacts = [
  require(path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts",
    "MagicSquare.json"
  )),
  require(path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts",
    "Migrations.json"
  )),
  require(path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts",
    "SquareLib.json"
  )),
  require(path.join(
    __dirname,
    "compilationSources",
    "build",
    "contracts",
    "VyperStorage.json"
  ))
];

const GetWorkspaceBytecode = gql`
  query GetWorkspaceBytecode($id: ID!) {
    bytecode(id: $id) {
      id
      bytes
      linkReferences {
        offsets
        name
        length
      }
    }
  }
`;

const GetWorkspaceSource = gql`
  query GetWorkspaceSource($id: ID!) {
    source(id: $id) {
      id
      contents
      sourcePath
    }
  }
`;

const GetWorkspaceContract = gql`
  query GetWorkspaceContract($id: ID!) {
    contract(id: $id) {
      id
      name
      abi {
        json
      }
      createBytecode {
        bytes
      }
      callBytecode {
        bytes
      }
      processedSource {
        source {
          contents
          sourcePath
        }
        ast {
          json
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
        processedSources {
          source {
            contents
            sourcePath
          }
        }
      }
    }
  }
`;

const GetWorkspaceCompilation = gql`
  query getWorkspaceCompilation($id: ID!) {
    compilation(id: $id) {
      compiler {
        name
        version
      }
      processedSources {
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
      sourceMaps {
        json
      }
    }
  }
`;

const GetWorkspaceNetwork = gql`
  query GetWorkspaceNetwork($id: ID!) {
    network(id: $id) {
      networkId
      id
      name
      historicBlock {
        height
        hash
      }
    }
  }
`;

const GetWorkspaceContractInstance = gql`
  query GetContractInstance($id: ID!) {
    contractInstance(id: $id) {
      address
      network {
        networkId
      }
      contract {
        name
      }
      creation {
        transactionHash
        constructor {
          createBytecode {
            bytecode {
              bytes
              linkReferences {
                offsets
                name
                length
              }
            }
          }
        }
      }
      callBytecode {
        bytecode {
          bytes
          linkReferences {
            offsets
            name
            length
          }
        }
      }
    }
  }
`;

describe("Compilation", () => {
  let sourceIds = [];
  let bytecodeIds = [];
  let callBytecodeIds = [];
  let compilationIds = [];
  let netIds = [];
  let migratedNetworks = [];
  let contractInstanceIds = [];
  let contractInstances = [];
  let expectedSolcCompilationId;
  let expectedVyperCompilationId;
  let contractNameRecordId;
  let previousContractNameRecord;
  let previousContractExpectedId;
  let expectedProjectId;
  let projectId;

  beforeAll(async () => {
    await Environment.detect(migrationConfig);
    const web3 = new Web3(migrationConfig.provider);
    const networkId = await web3.eth.net.getId();
    migrationConfig.reset = true;
    await Migrate.run(migrationConfig);
    await Promise.all(
      artifacts.map(async (contract, index) => {
        let sourceId = generateId({
          contents: contract["source"],
          sourcePath: contract["sourcePath"]
        });
        sourceIds.push({ id: sourceId });
        const shimBytecodeObject = Shims.LegacyToNew.forBytecode(
          contract["bytecode"]
        );
        const shimCallBytecodeObject = Shims.LegacyToNew.forBytecode(
          contract["deployedBytecode"]
        );
        let bytecodeId = generateId(shimBytecodeObject);
        bytecodeIds.push({ id: bytecodeId });
        let callBytecodeId = generateId(shimCallBytecodeObject);
        callBytecodeIds.push({ id: callBytecodeId });

        const networksPath = fse
          .readFileSync(
            path.join(
              __dirname,
              "compilationSources",
              "build",
              "contracts",
              migrationFileNames[index]
            )
          )
          .toString();
        let networks = JSON.parse(networksPath.toString()).networks;
        const networksArray = Object.entries(networks);

        if (networksArray.length > 0) {
          const links = networksArray[networksArray.length - 1][1]["links"];
          const transaction = await web3.eth.getTransaction(
            networksArray[networksArray.length - 1][1]["transactionHash"]
          );
          const historicBlock = {
            height: transaction.blockNumber,
            hash: transaction.blockHash
          };

          const netId = generateId({
            networkId: networkId,
            historicBlock: historicBlock
          });
          netIds.push({ id: netId });
          migratedNetworks.push({
            networkId: networkId,
            historicBlock: historicBlock,
            links: links
          });
          const contractInstanceId = generateId({
            network: {
              id: netId
            },
            address: networksArray[networksArray.length - 1][1]["address"]
          });
          contractInstanceIds.push({ id: contractInstanceId });
          contractInstances.push({
            address: networksArray[networksArray.length - 1][1]["address"],
            network: {
              name: "development",
              networkId: networkId,
              historicBlock: historicBlock
            },
            contract: {
              name: contract["contractName"]
            },
            creation: {
              transactionHash:
                networksArray[networksArray.length - 1][1]["transactionHash"],
              constructor: {
                createBytecode: {
                  bytecode: shimBytecodeObject
                }
              }
            },
            callBytecode: {
              bytecode: shimCallBytecodeObject
            }
          });
        }
      })
    );

    expectedSolcCompilationId = generateId({
      compiler: artifacts[0].compiler,
      sources: [sourceIds[0], sourceIds[1], sourceIds[2]]
    });
    expectedVyperCompilationId = generateId({
      compiler: artifacts[3].compiler,
      sources: [sourceIds[3]]
    });
    compilationIds.push(
      { id: expectedSolcCompilationId },
      { id: expectedVyperCompilationId }
    );

    expectedProjectId = generateId({
      directory: compilationConfig["working_directory"]
    });

    // setting up a fake previous contract to test previous name record
    const {
      data: {
        projectsAdd: { projects }
      }
    } = await db.query(AddProjects, {
      projects: [
        {
          directory: compilationConfig["working_directory"]
        }
      ]
    });

    expect(projects).toHaveLength(1);
    projectId = projects[0].id;

    expect(projectId).toEqual(expectedProjectId);

    let previousContract = {
      name: "Migrations",
      abi: { json: JSON.stringify(artifacts[1].abi) },
      createBytecode: bytecodeIds[0],
      callBytecode: callBytecodeIds[0]
    };

    await db.query(AddContracts, {
      contracts: [previousContract]
    });

    previousContractExpectedId = generateId({
      name: "Migrations",
      abi: { json: JSON.stringify(artifacts[1].abi) }
    });

    previousContractNameRecord = {
      name: "Migrations",
      type: "Contract",
      resource: {
        id: previousContractExpectedId
      }
    };

    // add this fake name record, which differs in its abi, so that a previous contract
    // with this name exists for testing; also adding as a name head here
    const contractNameRecord = await db.query(AddNameRecords, {
      nameRecords: [previousContractNameRecord]
    });

    contractNameRecordId =
      contractNameRecord.data.nameRecordsAdd.nameRecords[0].id;

    await db.query(AssignProjectNames, {
      projectNames: [
        {
          project: { id: projectId },
          name: "Migrations",
          type: "Contract",
          nameRecord: {
            id: contractNameRecordId
          }
        }
      ]
    });

    const loader = new ArtifactsLoader(db, compilationConfig);
    await loader.load();
  }, 10000);

  afterAll(async () => {
    await Promise.all(
      artifacts.map(async (contract, index) => {
        const migratedArtifactPath = fse
          .readFileSync(
            path.join(
              __dirname,
              "compilationSources",
              "build",
              "contracts",
              migrationFileNames[index]
            )
          )
          .toString();
        let migratedArtifact = JSON.parse(migratedArtifactPath);
        migratedArtifact.networks = {};
        migratedArtifact.updatedAt = "";
        migratedArtifact.schemaVersion = "3.0.11";
        fse.removeSync(
          path.join(
            __dirname,
            "compilationSources",
            "build",
            "contracts",
            migrationFileNames[index]
          )
        );
        fse.outputFileSync(
          path.join(
            __dirname,
            "compilationSources",
            "build",
            "contracts",
            migrationFileNames[index]
          ),
          JSON.stringify(migratedArtifact, null, 2)
        );
      })
    );
  });

  it("loads compilations", async () => {
    const compilationsQuery = await Promise.all(
      compilationIds.map(compilationId => {
        let compilation = db.query(GetWorkspaceCompilation, compilationId);
        return compilation;
      })
    );

    const solcCompilation = compilationsQuery[0].data.compilation;

    expect(solcCompilation.compiler.version).toEqual(
      artifacts[0].compiler.version
    );
    expect(solcCompilation.sources.length).toEqual(3);
    solcCompilation.sources.map((source, index) => {
      expect(source.id).toEqual(sourceIds[index].id);
      expect(source["contents"]).toEqual(artifacts[index].source);
      expect(solcCompilation.processedSources[index].source.contents).toEqual(
        artifacts[index].source
      );

      expect(
        solcCompilation.sourceMaps.find(
          ({ json }) => json === artifacts[index].sourceMap
        )
      ).toBeDefined();
    });

    const vyperCompilation = compilationsQuery[1].data.compilation;
    expect(vyperCompilation.compiler.version).toEqual(
      artifacts[3].compiler.version
    );
    expect(vyperCompilation.sources.length).toEqual(1);
    expect(vyperCompilation.sources[0].id).toEqual(sourceIds[3].id);
    expect(vyperCompilation.sources[0].contents).toEqual(artifacts[3].source);
    expect(vyperCompilation.processedSources[0].source.contents).toEqual(
      artifacts[3].source
    );
  });

  it("loads contract sources", async () => {
    for (let index in sourceIds) {
      let {
        data: {
          source: { contents, sourcePath }
        }
      } = await db.query(GetWorkspaceSource, sourceIds[index]);

      expect(contents).toEqual(artifacts[index].source);
      expect(sourcePath).toEqual(artifacts[index].sourcePath);
    }
  });

  it("loads bytecodes", async () => {
    for (let index in bytecodeIds) {
      let {
        data: {
          bytecode: { bytes }
        }
      } = await db.query(GetWorkspaceBytecode, bytecodeIds[index]);

      let shimmedBytecode = Shims.LegacyToNew.forBytecode(
        artifacts[index].bytecode
      );
      expect(bytes).toEqual(shimmedBytecode.bytes);
    }
  });

  it("loads contracts", async () => {
    let contractIds = [];

    for (let index in artifacts) {
      let expectedId = generateId({
        name: artifacts[index].contractName,
        abi: { json: JSON.stringify(artifacts[index].abi) },
        processedSource: {
          index: artifacts[index].compiler.name === "solc" ? +index : 0
        },
        compilation: {
          id:
            artifacts[index].compiler.name === "solc"
              ? expectedSolcCompilationId
              : expectedVyperCompilationId
        }
      });

      contractNameRecordId =
        artifacts[index].contractName === previousContractNameRecord.name
          ? generateId({
              name: artifacts[index].contractName,
              type: "Contract",
              resource: {
                id: expectedId
              },
              previous: {
                id: previousContractExpectedId
              }
            })
          : generateId({
              name: artifacts[index].contractName,
              type: "Contract",
              resource: {
                id: expectedId
              }
            });

      contractIds.push({ id: expectedId });

      let {
        data: {
          contract: {
            id,
            name,
            processedSource: {
              source: { contents }
            },
            compilation: {
              compiler: { version }
            },
            createBytecode,
            callBytecode
          }
        }
      } = await db.query(GetWorkspaceContract, contractIds[index]);

      const artifactsCreateBytecode = Shims.LegacyToNew.forBytecode(
        artifacts[index].bytecode
      );
      expect(createBytecode.bytes).toEqual(artifactsCreateBytecode.bytes);

      const artifactsCallBytecode = Shims.LegacyToNew.forBytecode(
        artifacts[index].deployedBytecode
      );
      expect(callBytecode.bytes).toEqual(artifactsCallBytecode.bytes);

      expect(name).toEqual(artifacts[index].contractName);
      expect(contents).toEqual(artifacts[index].source);
      expect(version).toEqual(artifacts[index].compiler.version);
      expect(id).toEqual(contractIds[index].id);

      const {
        data: {
          project: { resolve }
        }
      } = await db.query(ResolveProjectName, {
        projectId,
        name: artifacts[index].contractName,
        type: "Contract"
      });

      const nameRecord = resolve[0];

      expect(nameRecord.resource.id).toEqual(contractIds[index].id);
    }
  });

  it("loads networks", async () => {
    for (let index in migratedArtifacts) {
      let {
        data: {
          network: { name, networkId, historicBlock }
        }
      } = await db.query(GetWorkspaceNetwork, netIds[index]);

      expect(name).toEqual("development");
      expect(networkId).toEqual(migratedNetworks[index]["networkId"]);
      expect(historicBlock).toEqual(migratedNetworks[index]["historicBlock"]);
    }
  });

  it("loads contract instances", async () => {
    for (const contractInstanceId of contractInstanceIds) {
      let {
        data: {
          contractInstance: {
            address,
            network: { networkId },
            contract: { name },
            creation: {
              transactionHash,
              constructor: {
                createBytecode: {
                  bytecode: { bytes, linkReferences }
                }
              }
            },
            callBytecode: { bytecode }
          }
        }
      } = await db.query(GetWorkspaceContractInstance, contractInstanceId);

      const contractInstance = contractInstances.find(
        contractInstance => name === contractInstance.contract.name
      );

      expect(contractInstance).toBeDefined();

      expect(name).toEqual(contractInstance.contract.name);
      expect(networkId).toEqual(contractInstance.network.networkId);
      expect(address).toEqual(contractInstance.address);
      expect(transactionHash).toEqual(
        contractInstance.creation.transactionHash
      );
      expect(bytes).toEqual(
        contractInstance.creation.constructor.createBytecode.bytecode.bytes
      );
      expect(linkReferences).toEqual(
        contractInstance.creation.constructor.createBytecode.bytecode
          .linkReferences
      );
      expect(bytecode.bytes).toEqual(
        contractInstance.callBytecode.bytecode.bytes
      );
    }
  });
});
