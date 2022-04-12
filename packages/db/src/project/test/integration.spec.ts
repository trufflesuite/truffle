import { logger } from "@truffle/db/logger";
const debug = logger("db:project:test:integration");

import path from "path";
import gql from "graphql-tag";
import { connect } from "@truffle/db";
import { ArtifactsLoader } from "./artifacts";
import { generateId } from "@truffle/db/system";
import Migrate from "@truffle/migrate";
import { Environment } from "@truffle/environment";
import Config from "@truffle/config";
import Ganache from "ganache";
import Web3 from "web3";
import * as fse from "fs-extra";
import * as tmp from "tmp";
import { Shims } from "@truffle/compile-common";
import type { DataModel, Resource, IdObject } from "@truffle/db/resources";
import type { Query, Mutation } from "@truffle/db/process";

let server;
const port = 8545;
// @ts-ignore jest-specific pedantry
beforeAll(async () => {
  server = Ganache.server({
    // note instamine must be set to eager (default) with vmErrorsOnRPCResponse enabled
    vmErrorsOnRPCResponse: true
  });
  await server.listen(port);
});

afterAll(async () => {
  tempDir.removeCallback();
  await server.close();
});

const compilationResult = require(path.join(
  __dirname,
  "workflowCompileOutputMock",
  "compilationOutput.json"
));

const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();

const compilationConfig = {
  contracts_directory: path.join(__dirname, "compilationSources"),
  contracts_build_directory: path.join(
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

const db = connect({
  adapter: {
    name: "memory"
  }
});

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

const AddProjects = gql`
  mutation AddProjects($projects: [ProjectInput!]!) {
    projectsAdd(input: { projects: $projects }) {
      projects {
        id
        directory
      }
    }
  }
`;

const AddNameRecords = gql`
  mutation AddNameRecords($nameRecords: [NameRecordInput!]!) {
    nameRecordsAdd(input: { nameRecords: $nameRecords }) {
      nameRecords {
        id
        resource {
          name
        }
        previous {
          id
        }
      }
    }
  }
`;

const AssignProjectNames = gql`
  mutation AssignProjectNames($projectNames: [ProjectNameInput!]!) {
    projectNamesAssign(input: { projectNames: $projectNames }) {
      projectNames {
        key {
          name
          type
        }
        nameRecord {
          resource {
            id
          }
        }
      }
    }
  }
`;

const ResolveProjectName = gql`
  query ResolveProjectName($projectId: ID!, $type: String!, $name: String!) {
    project(id: $projectId) {
      resolve(type: $type, name: $name) {
        id
        resource {
          id
          name
        }
      }
    }
  }
`;

const AddContracts = gql`
  mutation AddContracts($contracts: [ContractInput!]!) {
    contractsAdd(input: { contracts: $contracts }) {
      contracts {
        id
        name
        abi {
          json
        }
        processedSource {
          source {
            contents
            sourcePath
          }
          ast {
            json
          }
          language
        }
        compilation {
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
        createBytecode {
          id
          bytes
          linkReferences {
            offsets
            name
            length
          }
        }
        callBytecode {
          id
          bytes
          linkReferences {
            offsets
            name
            length
          }
        }
        callBytecodeGeneratedSources {
          source {
            sourcePath
          }
        }
        createBytecodeGeneratedSources {
          source {
            sourcePath
          }
        }
      }
    }
  }
`;

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
      callBytecodeGeneratedSources {
        source {
          sourcePath
          contents
        }
        ast {
          json
        }
        language
      }
      createBytecodeGeneratedSources {
        source {
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
        processedSources {
          source {
            contents
            sourcePath
          }
          language
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
        language
      }
      sources {
        id
        contents
        sourcePath
      }
      sourceMaps {
        data
      }
      immutableReferences {
        astNode
        bytecode {
          bytes
        }
        length
        offsets
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
  let sourceIds: IdObject<"sources">[] = [];
  let bytecodeIds: IdObject<"bytecodes">[] = [];
  let callBytecodeIds: IdObject<"bytecodes">[] = [];
  let compilationIds: IdObject<"compilations">[] = [];
  let netIds: IdObject<"networks">[] = [];
  let migratedNetworks: any[] = [];
  let contractIds: any[] = [];
  let contractInstanceIds: IdObject<"contractInstances">[] = [];
  let contractInstances: any[] = [];
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

    sourceIds = artifacts.map(
      artifact =>
        ({
          id: generateId("sources", {
            contents: artifact["source"],
            sourcePath: artifact["sourcePath"]
          })
        } as IdObject<"sources">)
    );

    bytecodeIds = artifacts.map(
      artifact =>
        ({
          id: generateId(
            "bytecodes",
            Shims.LegacyToNew.forBytecode(artifact["bytecode"])
          )
        } as IdObject<"bytecodes">)
    );

    callBytecodeIds = artifacts.map(
      artifact =>
        ({
          id: generateId(
            "bytecodes",
            Shims.LegacyToNew.forBytecode(artifact["deployedBytecode"])
          )
        } as IdObject<"bytecodes">)
    );

    expectedSolcCompilationId = generateId("compilations", {
      compiler: artifacts[0].compiler,
      sources: [sourceIds[0], sourceIds[1], sourceIds[2]]
    });
    expectedVyperCompilationId = generateId("compilations", {
      compiler: artifacts[3].compiler,
      sources: [sourceIds[3]]
    });
    compilationIds.push(
      { id: expectedSolcCompilationId } as IdObject<"compilations">,
      { id: expectedVyperCompilationId } as IdObject<"compilations">
    );

    expectedProjectId = generateId("projects", {
      directory: compilationConfig["working_directory"]
    });

    await Promise.all(
      artifacts.map(async (contract, index) => {
        const shimBytecodeObject = Shims.LegacyToNew.forBytecode(
          contract["bytecode"]
        );
        const shimCallBytecodeObject = Shims.LegacyToNew.forBytecode(
          contract["deployedBytecode"]
        );
        // @ts-ignore won't be undefined
        let bytecodeId: string = generateId("bytecodes", shimBytecodeObject);

        // @ts-ignore won't be updefined
        let contractId: string = generateId("contracts", {
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
        contractIds.push({
          id: contractId
        });

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
        const networksArray: any = Object.entries(networks);

        if (networksArray.length > 0) {
          const links = networksArray[networksArray.length - 1][1]["links"];
          const transaction = await web3.eth.getTransaction(
            networksArray[networksArray.length - 1][1]["transactionHash"]
          );
          const historicBlock: DataModel.Block = {
            height: transaction.blockNumber as number,
            hash: transaction.blockHash as string
          };

          const netId = generateId("networks", {
            networkId: networkId,
            historicBlock: historicBlock
          });
          debug("netId %o", netId);
          netIds.push({ id: netId } as IdObject<"networks">);
          migratedNetworks.push({
            networkId: networkId,
            historicBlock: historicBlock,
            links: links
          });
          const contractInstanceId = generateId("contractInstances", {
            contract: { id: contractId },
            address: networksArray[networksArray.length - 1][1]["address"],
            creation: {
              transactionHash:
                networksArray[networksArray.length - 1][1]["transactionHash"],
              constructor: {
                createBytecode: {
                  bytecode: { id: bytecodeId },
                  linkValues: shimBytecodeObject.linkReferences
                    .filter(linkReference => !!linkReference.name)
                    .map(({ name }, index) => ({
                      // @ts-ignore name won't be null because filter
                      value: links[name],
                      linkReference: {
                        bytecode: { id: bytecodeId },
                        index
                      }
                    }))
                }
              }
            }
          });
          contractInstanceIds.push({
            id: contractInstanceId
          } as IdObject<"contractInstances">);
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

    // setting up a fake previous contract to test previous name record
    const {
      data: {
        projectsAdd: { projects }
      }
    } = (await db.execute(AddProjects, {
      projects: [
        {
          directory: compilationConfig["working_directory"]
        }
      ]
    })) as { data: Mutation<"projectsAdd"> };

    expect(projects).toHaveLength(1);
    projectId = projects[0].id;

    expect(projectId).toEqual(expectedProjectId);

    let previousContract = {
      name: "Migrations",
      abi: { json: JSON.stringify(artifacts[1].abi) },
      createBytecode: bytecodeIds[0],
      callBytecode: callBytecodeIds[0],
      callBytecodeGeneratedSources: [],
      createBytecodeGeneratedSources: []
    };

    await db.execute(AddContracts, {
      contracts: [previousContract]
    });

    previousContractExpectedId = generateId("contracts", {
      name: "Migrations",
      abi: { json: JSON.stringify(artifacts[1].abi) }
    });

    previousContractNameRecord = {
      resource: {
        id: previousContractExpectedId,
        type: "Contract"
      }
    };

    // add this fake name record, which differs in its abi, so that a previous contract
    // with this name exists for testing; also adding as a name head here
    const contractNameRecord = (await db.execute(AddNameRecords, {
      nameRecords: [previousContractNameRecord]
    })) as { data: Mutation<"nameRecordsAdd"> };

    contractNameRecordId =
      contractNameRecord.data.nameRecordsAdd.nameRecords[0].id;

    await db.execute(AssignProjectNames, {
      projectNames: [
        {
          project: { id: projectId },
          key: {
            name: "Migrations",
            type: "Contract"
          },
          nameRecord: {
            id: contractNameRecordId
          }
        }
      ]
    });

    const loader = new ArtifactsLoader(db, compilationConfig);
    await loader.load(compilationResult);
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
        migratedArtifact.schemaVersion = "3.0.9";
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
      compilationIds.map(async compilationId => {
        let compilation = (await db.execute(
          GetWorkspaceCompilation,
          compilationId
        )) as { data: Query<"compilation"> };
        return compilation;
      })
    );

    const solcCompilation = compilationsQuery[0].data
      .compilation as Resource<"compilations">;

    expect(solcCompilation.compiler.version).toEqual(
      artifacts[0].compiler.version
    );
    expect(solcCompilation.sources.length).toEqual(3);
    solcCompilation.sources.map((source, index) => {
      // @ts-ignore
      expect(source.id).toEqual(sourceIds[index].id);
      // @ts-ignore
      expect(source.contents).toEqual(artifacts[index].source);
      // @ts-ignore
      expect(solcCompilation.processedSources[index].source.contents).toEqual(
        artifacts[index].source
      );
      // @ts-ignore
      expect(solcCompilation.processedSources[index].language).toEqual(
        "Solidity"
      );

      expect(
        // @ts-ignore
        solcCompilation.sourceMaps.find(
          sourceMap =>
            sourceMap && sourceMap.data === artifacts[index].sourceMap
        )
      ).toBeDefined();
    });

    expect(Array.isArray(solcCompilation.immutableReferences)).toBe(true);
    expect(solcCompilation.immutableReferences[0]).toHaveProperty("astNode");
    expect(solcCompilation.immutableReferences[0]).toHaveProperty("length");
    expect(solcCompilation.immutableReferences[0]).toHaveProperty("offsets");
    // @ts-ignore
    expect(solcCompilation.immutableReferences[0].astNode).toEqual(
      Object.entries(artifacts[0].immutableReferences)[0][0]
    );
    // @ts-ignore
    expect(solcCompilation.immutableReferences[0].length).toEqual(
      // @ts-ignore
      Object.entries(artifacts[0].immutableReferences)[0][1][0].length
    );
    // @ts-ignore
    expect(solcCompilation.immutableReferences[0].offsets[0]).toEqual(
      // @ts-ignore
      Object.entries(artifacts[0].immutableReferences)[0][1][0].start
    );

    let shimmedBytecode = Shims.LegacyToNew.forBytecode(
      artifacts[0].deployedBytecode
    );
    // @ts-ignore
    expect(solcCompilation.immutableReferences[0].bytecode.bytes).toEqual(
      shimmedBytecode.bytes
    );

    const vyperCompilation = compilationsQuery[1].data.compilation;
    // @ts-ignore
    expect(vyperCompilation.compiler.version).toEqual(
      artifacts[3].compiler.version
    );
    // @ts-ignore
    expect(vyperCompilation.sources.length).toEqual(1);
    // @ts-ignore
    expect(vyperCompilation.sources[0].id).toEqual(sourceIds[3].id);
    // @ts-ignore
    expect(vyperCompilation.sources[0].contents).toEqual(artifacts[3].source);
    // @ts-ignore
    expect(vyperCompilation.processedSources[0].source.contents).toEqual(
      // @ts-ignore
      artifacts[3].source
    );
    // @ts-ignore
    expect(vyperCompilation.processedSources[0].language).toEqual("Vyper");
    // @ts-ignore
    expect(vyperCompilation.immutableReferences).toEqual([]);
  });

  it("loads contract sources", async () => {
    for (let index in sourceIds) {
      let {
        data: {
          source: { contents, sourcePath }
        }
      } = (await db.execute(GetWorkspaceSource, sourceIds[index])) as {
        data: Query<"source"> & { source: Resource<"sources"> };
      };

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
      } = (await db.execute(GetWorkspaceBytecode, bytecodeIds[index])) as {
        data: Query<"bytecode"> & { bytecode: Resource<"bytecodes"> };
      };

      let shimmedBytecode = Shims.LegacyToNew.forBytecode(
        artifacts[index].bytecode
      );
      expect(bytes).toEqual(shimmedBytecode.bytes);
    }
  });

  it("loads contracts", async () => {
    for (let index in artifacts) {
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
            callBytecode,
            callBytecodeGeneratedSources
          }
        }
      } = (await db.execute(GetWorkspaceContract, contractIds[index])) as {
        data: Query<"contract"> & {
          contract: Resource<"contracts"> & {
            processedSource: DataModel.ProcessedSource;
            compilation: Resource<"compilations">;
            createBytecode: Resource<"bytecodes">;
            callBytecode: Resource<"bytecodes">;
            callBytecodeGeneratedSources: (
              | DataModel.ProcessedSource
              | undefined
            )[];
          };
        };
      };

      const artifactsCreateBytecode = Shims.LegacyToNew.forBytecode(
        artifacts[index].bytecode
      );
      expect(createBytecode.bytes).toEqual(artifactsCreateBytecode.bytes);

      //only test generatedSources for solc compiled contracts
      if (name !== "VyperStorage") {
        for (const { id, name, ast, contents, language } of artifacts[index]
          .deployedGeneratedSources) {
          const generatedSource = callBytecodeGeneratedSources[id];
          expect(generatedSource).toBeDefined();
          expect(generatedSource.source.sourcePath).toEqual(name);
          expect(generatedSource.ast?.json).toEqual(JSON.stringify(ast));
          expect(generatedSource.source.contents).toEqual(contents);
          expect(generatedSource.language).toEqual(language);
        }
      }

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
      } = (await db.execute(ResolveProjectName, {
        projectId,
        name: artifacts[index].contractName,
        type: "Contract"
      })) as {
        data: Query<"project"> & {
          project: Resource<"projects"> & {
            resolve: (Resource<"nameRecords"> & {
              resource: IdObject;
            })[];
          };
        };
      };

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
      } = (await db.execute(GetWorkspaceNetwork, netIds[index])) as {
        data: Query<"network"> & { network: Resource<"networks"> };
      };

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
      } = (await db.execute(
        GetWorkspaceContractInstance,
        contractInstanceId
      )) as {
        data: Query<"contractInstance"> & {
          contractInstance: Resource<"contractInstances"> & {
            contract: Resource<"contracts">;
            creation: DataModel.ContractInstanceCreation & {
              constructor: {
                createBytecode: DataModel.LinkedBytecode;
              };
            };
          };
        };
      };

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
