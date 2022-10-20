const debug = require("debug")("scenarios:db:integration");
const path = require("path");
const gql = require("graphql-tag");
const { connect } = require("@truffle/db");
const { generateId } = require("@truffle/db");
const { ArtifactsLoader } = require("@truffle/db").Project.Test;
const Migrate = require("@truffle/migrate").default;
const { Environment } = require("@truffle/environment");
const Config = require("@truffle/config");
const Web3 = require("web3");
const fse = require("fs-extra");
const tmp = require("tmp");
const { Shims } = require("@truffle/compile-common");
const { expect } = require("chai");

const sourcesDirectory = path.join(__dirname, "../..", "sources", "db");

after(async () => {
  tempDir.removeCallback();
  await migrationConfig.provider.disconnect();
});

const compilationResult = require(path.join(
  sourcesDirectory,
  "compilationOutput.json"
));

const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();

const compilationConfig = {
  contracts_directory: path.join(sourcesDirectory, "compilationSources"),
  contracts_build_directory: path.join(
    sourcesDirectory,
    "compilationSources",
    "build",
    "contracts"
  ),
  working_directory: tempDir.name,
  all: true
};

const migrationFileNames = [
  "MagicSquare.json",
  "Migrations.json",
  "SquareLib.json",
  "VyperStorage.json"
];

const migrationConfig = Config.detect({
  workingDirectory: path.join(sourcesDirectory, "compilationSources")
});
migrationConfig.network = "development";

const db = connect({
  adapter: {
    name: "memory"
  }
});

const artifacts = [
  require(path.join(
    sourcesDirectory,
    "compilationSources",
    "build",
    "contracts",
    "MagicSquare.json"
  )),
  require(path.join(
    sourcesDirectory,
    "compilationSources",
    "build",
    "contracts",
    "Migrations.json"
  )),
  require(path.join(
    sourcesDirectory,
    "compilationSources",
    "build",
    "contracts",
    "SquareLib.json"
  )),
  require(path.join(
    sourcesDirectory,
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

describe.only("Compilation", () => {
  let sourceIds = [];
  let bytecodeIds = [];
  let callBytecodeIds = [];
  let compilationIds = [];
  let netIds = [];
  let migratedNetworks = [];
  let contractIds = [];
  let contractInstanceIds = [];
  let contractInstances = [];
  let expectedSolcCompilationId;
  let expectedVyperCompilationId;
  let contractNameRecordId;
  let previousContractNameRecord;
  let previousContractExpectedId;
  let expectedProjectId;
  let projectId;

  before(async () => {
    await Environment.detect(migrationConfig);
    const web3 = new Web3(migrationConfig.provider);
    const networkId = await web3.eth.net.getId();
    migrationConfig.reset = true;
    await Migrate.run(migrationConfig);

    sourceIds = artifacts.map(artifact => ({
      id: generateId("sources", {
        contents: artifact["source"],
        sourcePath: artifact["sourcePath"]
      })
    }));

    bytecodeIds = artifacts.map(artifact => ({
      id: generateId(
        "bytecodes",
        Shims.LegacyToNew.forBytecode(artifact["bytecode"])
      )
    }));

    callBytecodeIds = artifacts.map(artifact => ({
      id: generateId(
        "bytecodes",
        Shims.LegacyToNew.forBytecode(artifact["deployedBytecode"])
      )
    }));

    expectedSolcCompilationId = generateId("compilations", {
      compiler: artifacts[0].compiler,
      sources: [sourceIds[0], sourceIds[1], sourceIds[2]]
    });
    expectedVyperCompilationId = generateId("compilations", {
      compiler: artifacts[3].compiler,
      sources: [sourceIds[3]]
    });
    compilationIds.push(
      { id: expectedSolcCompilationId },
      { id: expectedVyperCompilationId }
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
        let bytecodeId = generateId("bytecodes", shimBytecodeObject);

        let contractId = generateId("contracts", {
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
              sourcesDirectory,
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

          const netId = generateId("networks", {
            networkId: networkId,
            historicBlock: historicBlock
          });
          debug("netId %o", netId);
          netIds.push({ id: netId });
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
          });
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
    } = await db.execute(AddProjects, {
      projects: [
        {
          directory: compilationConfig["working_directory"]
        }
      ]
    });

    expect(projects.length).to.equal(1);
    projectId = projects[0].id;

    expect(projectId).to.equal(expectedProjectId);

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
    const contractNameRecord = await db.execute(AddNameRecords, {
      nameRecords: [previousContractNameRecord]
    });

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

  after(async () => {
    await Promise.all(
      artifacts.map(async (contract, index) => {
        const migratedArtifactPath = fse
          .readFileSync(
            path.join(
              sourcesDirectory,
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
            sourcesDirectory,
            "compilationSources",
            "build",
            "contracts",
            migrationFileNames[index]
          )
        );
        fse.outputFileSync(
          path.join(
            sourcesDirectory,
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
        let compilation = await db.execute(
          GetWorkspaceCompilation,
          compilationId
        );
        return compilation;
      })
    );

    const solcCompilation = compilationsQuery[0].data.compilation;

    expect(solcCompilation.compiler.version).to.equal(
      artifacts[0].compiler.version
    );
    expect(solcCompilation.sources.length).to.equal(3);
    solcCompilation.sources.map((source, index) => {
      expect(source.id).to.equal(sourceIds[index].id);
      expect(source.contents).to.equal(artifacts[index].source);
      expect(solcCompilation.processedSources[index].source.contents).to.equal(
        artifacts[index].source
      );
      expect(solcCompilation.processedSources[index].language).to.equal(
        "Solidity"
      );

      expect(
        solcCompilation.sourceMaps.find(
          sourceMap =>
            sourceMap && sourceMap.data === artifacts[index].sourceMap
        )
      ).to.not.equal(undefined);
    });

    expect(Array.isArray(solcCompilation.immutableReferences)).to.equal(true);
    expect(solcCompilation.immutableReferences[0]).to.have.property("astNode");
    expect(solcCompilation.immutableReferences[0]).to.have.property("length");
    expect(solcCompilation.immutableReferences[0]).to.have.property("offsets");
    expect(solcCompilation.immutableReferences[0].astNode).to.equal(
      Object.entries(artifacts[0].immutableReferences)[0][0]
    );
    expect(solcCompilation.immutableReferences[0].length).to.equal(
      Object.entries(artifacts[0].immutableReferences)[0][1][0].length
    );
    expect(solcCompilation.immutableReferences[0].offsets[0]).to.equal(
      Object.entries(artifacts[0].immutableReferences)[0][1][0].start
    );

    let shimmedBytecode = Shims.LegacyToNew.forBytecode(
      artifacts[0].deployedBytecode
    );
    expect(solcCompilation.immutableReferences[0].bytecode.bytes).to.equal(
      shimmedBytecode.bytes
    );

    const vyperCompilation = compilationsQuery[1].data.compilation;
    expect(vyperCompilation.compiler.version).to.equal(
      artifacts[3].compiler.version
    );
    expect(vyperCompilation.sources.length).to.equal(1);
    expect(vyperCompilation.sources[0].id).to.equal(sourceIds[3].id);
    expect(vyperCompilation.sources[0].contents).to.equal(artifacts[3].source);
    expect(vyperCompilation.processedSources[0].source.contents).to.equal(
      artifacts[3].source
    );
    expect(vyperCompilation.processedSources[0].language).to.equal("Vyper");
    expect(vyperCompilation.immutableReferences.length).to.equal(0);
  });

  it("loads contract sources", async () => {
    for (let index in sourceIds) {
      let {
        data: {
          source: { contents, sourcePath }
        }
      } = await db.execute(GetWorkspaceSource, sourceIds[index]);

      expect(contents).to.equal(artifacts[index].source);
      expect(sourcePath).to.equal(artifacts[index].sourcePath);
    }
  });

  it("loads bytecodes", async () => {
    for (let index in bytecodeIds) {
      let {
        data: {
          bytecode: { bytes }
        }
      } = await db.execute(GetWorkspaceBytecode, bytecodeIds[index]);

      let shimmedBytecode = Shims.LegacyToNew.forBytecode(
        artifacts[index].bytecode
      );
      expect(bytes).to.equal(shimmedBytecode.bytes);
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
      } = await db.execute(GetWorkspaceContract, contractIds[index]);
      const artifactsCreateBytecode = Shims.LegacyToNew.forBytecode(
        artifacts[index].bytecode
      );
      expect(createBytecode.bytes).to.equal(artifactsCreateBytecode.bytes);

      //only test generatedSources for solc compiled contracts
      if (name !== "VyperStorage") {
        for (const { id, name, ast, contents, language } of artifacts[index]
          .deployedGeneratedSources) {
          const generatedSource = callBytecodeGeneratedSources[id];
          expect(generatedSource).to.not.equal(undefined);
          expect(generatedSource.source.sourcePath).to.equal(name);
          expect(generatedSource.ast?.json).to.equal(JSON.stringify(ast));
          expect(generatedSource.source.contents).to.equal(contents);
          expect(generatedSource.language).to.equal(language);
        }
      }

      const artifactsCallBytecode = Shims.LegacyToNew.forBytecode(
        artifacts[index].deployedBytecode
      );
      expect(callBytecode.bytes).to.equal(artifactsCallBytecode.bytes);

      expect(name).to.equal(artifacts[index].contractName);
      expect(contents).to.equal(artifacts[index].source);
      expect(version).to.equal(artifacts[index].compiler.version);
      expect(id).to.equal(contractIds[index].id);

      const {
        data: {
          project: { resolve }
        }
      } = await db.execute(ResolveProjectName, {
        projectId,
        name: artifacts[index].contractName,
        type: "Contract"
      });

      const nameRecord = resolve[0];

      expect(nameRecord.resource.id).to.equal(contractIds[index].id);
    }
  });

  it("loads contract instances", async () => {
    for (const contractInstanceId of contractInstanceIds) {
      console.log("the ids -- %o", contractInstanceId);
      console.log(
        "the result ---- %o",
        await db.execute(GetWorkspaceContractInstance, contractInstanceId)
      );
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
      } = await db.execute(GetWorkspaceContractInstance, contractInstanceId);

      const contractInstance = contractInstances.find(
        contractInstance => name === contractInstance.contract.name
      );

      expect(contractInstance).to.not.equal(undefined);

      expect(name).to.equal(contractInstance.contract.name);
      expect(networkId).to.equal(contractInstance.network.networkId);
      expect(address).to.equal(contractInstance.address);
      expect(transactionHash).to.equal(
        contractInstance.creation.transactionHash
      );
      expect(bytes).to.equal(
        contractInstance.creation.constructor.createBytecode.bytecode.bytes
      );
      expect(linkReferences).to.equal(
        contractInstance.creation.constructor.createBytecode.bytecode
          .linkReferences
      );
      expect(bytecode.bytes).to.equal(
        contractInstance.callBytecode.bytecode.bytes
      );
    }
  });
});
