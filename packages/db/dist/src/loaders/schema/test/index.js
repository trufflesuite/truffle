"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const db_1 = require("@truffle/db");
const artifactsLoader_1 = require("@truffle/db/loaders/schema/artifactsLoader");
const contracts_1 = require("@truffle/db/loaders/resources/contracts");
const nameRecords_1 = require("@truffle/db/loaders/resources/nameRecords");
const projects_1 = require("@truffle/db/loaders/resources/projects");
const helpers_1 = require("@truffle/db/helpers");
const migrate_1 = __importDefault(require("@truffle/migrate"));
const environment_1 = require("@truffle/environment");
const config_1 = __importDefault(require("@truffle/config"));
const ganache_core_1 = __importDefault(require("ganache-core"));
const web3_1 = __importDefault(require("web3"));
const fse = __importStar(require("fs-extra"));
const shims_1 = require("@truffle/workflow-compile/shims");
const tmp = __importStar(require("tmp"));
let server;
const port = 8545;
beforeAll((done) => __awaiter(void 0, void 0, void 0, function* () {
    server = ganache_core_1.default.server();
    server.listen(port, done);
}));
afterAll((done) => __awaiter(void 0, void 0, void 0, function* () {
    tempDir.removeCallback();
    setTimeout(() => server.close(done), 500);
}));
// mocking the truffle-workflow-compile to avoid jest timing issues
// and also to keep from adding more time to Travis testing
jest.mock("@truffle/workflow-compile/new", () => ({
    compile: function (config, callback) {
        return require(path_1.default.join(__dirname, "workflowCompileOutputMock", "compilationOutput.json"));
    }
}));
const fixturesDirectory = path_1.default.join(__dirname, "compilationSources", "build", "contracts");
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
    contracts_directory: path_1.default.join(__dirname, "compilationSources"),
    contracts_build_directory: path_1.default.join(__dirname, "compilationSources", "build", "contracts"),
    artifacts_directory: path_1.default.join(__dirname, "compilationSources", "build", "contracts"),
    working_directory: tempDir.name,
    all: true
};
const migratedArtifacts = [
    require(path_1.default.join(__dirname, "compilationSources", "build", "contracts", "MagicSquare.json")),
    require(path_1.default.join(__dirname, "compilationSources", "build", "contracts", "Migrations.json")),
    require(path_1.default.join(__dirname, "compilationSources", "build", "contracts", "SquareLib.json")),
    require(path_1.default.join(__dirname, "compilationSources", "build", "contracts", "VyperStorage.json"))
];
const migrationFileNames = [
    "MagicSquare.json",
    "Migrations.json",
    "SquareLib.json",
    "VyperStorage.json"
];
const migrationConfig = config_1.default.detect({
    workingDirectory: path_1.default.join(__dirname, "compilationSources")
});
migrationConfig.network = "development";
const db = new db_1.TruffleDB(config);
const Migrations = require(path_1.default.join(fixturesDirectory, "Migrations.json"));
const artifacts = [
    require(path_1.default.join(__dirname, "compilationSources", "build", "contracts", "MagicSquare.json")),
    require(path_1.default.join(__dirname, "compilationSources", "build", "contracts", "Migrations.json")),
    require(path_1.default.join(__dirname, "compilationSources", "build", "contracts", "SquareLib.json")),
    require(path_1.default.join(__dirname, "compilationSources", "build", "contracts", "VyperStorage.json"))
];
const GetWorkspaceBytecode = graphql_tag_1.default `
  query GetWorkspaceBytecode($id: ID!) {
    workspace {
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
  }
`;
const GetWorkspaceSource = graphql_tag_1.default `
  query GetWorkspaceSource($id: ID!) {
    workspace {
      source(id: $id) {
        id
        contents
        sourcePath
      }
    }
  }
`;
const GetWorkspaceContract = graphql_tag_1.default `
  query GetWorkspaceContract($id: ID!) {
    workspace {
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
  }
`;
const GetWorkspaceCompilation = graphql_tag_1.default `
  query getWorkspaceCompilation($id: ID!) {
    workspace {
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
  }
`;
const GetWorkspaceNetwork = graphql_tag_1.default `
  query GetWorkspaceNetwork($id: ID!) {
    workspace {
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
  }
`;
const GetWorkspaceContractInstance = graphql_tag_1.default `
  query GetContractInstance($id: ID!) {
    workspace {
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
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield environment_1.Environment.detect(migrationConfig);
        const web3 = new web3_1.default(migrationConfig.provider);
        const networkId = yield web3.eth.net.getId();
        migrationConfig.reset = true;
        yield migrate_1.default.run(migrationConfig);
        yield Promise.all(artifacts.map((contract, index) => __awaiter(void 0, void 0, void 0, function* () {
            let sourceId = helpers_1.generateId({
                contents: contract["source"],
                sourcePath: contract["sourcePath"]
            });
            sourceIds.push({ id: sourceId });
            const shimBytecodeObject = shims_1.shimBytecode(contract["bytecode"]);
            const shimCallBytecodeObject = shims_1.shimBytecode(contract["deployedBytecode"]);
            let bytecodeId = helpers_1.generateId(shimBytecodeObject);
            bytecodeIds.push({ id: bytecodeId });
            let callBytecodeId = helpers_1.generateId(shimCallBytecodeObject);
            callBytecodeIds.push({ id: callBytecodeId });
            const networksPath = fse
                .readFileSync(path_1.default.join(__dirname, "compilationSources", "build", "contracts", migrationFileNames[index]))
                .toString();
            let networks = JSON.parse(networksPath.toString()).networks;
            const networksArray = Object.entries(networks);
            if (networksArray.length > 0) {
                const links = networksArray[networksArray.length - 1][1]["links"];
                const transaction = yield web3.eth.getTransaction(networksArray[networksArray.length - 1][1]["transactionHash"]);
                const historicBlock = {
                    height: transaction.blockNumber,
                    hash: transaction.blockHash
                };
                const netId = helpers_1.generateId({
                    networkId: networkId,
                    historicBlock: historicBlock
                });
                netIds.push({ id: netId });
                migratedNetworks.push({
                    networkId: networkId,
                    historicBlock: historicBlock,
                    links: links
                });
                const contractInstanceId = helpers_1.generateId({
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
                        transactionHash: networksArray[networksArray.length - 1][1]["transactionHash"],
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
        })));
        expectedSolcCompilationId = helpers_1.generateId({
            compiler: artifacts[0].compiler,
            sources: [sourceIds[0], sourceIds[1], sourceIds[2]]
        });
        expectedVyperCompilationId = helpers_1.generateId({
            compiler: artifacts[3].compiler,
            sources: [sourceIds[3]]
        });
        compilationIds.push({ id: expectedSolcCompilationId }, { id: expectedVyperCompilationId });
        expectedProjectId = helpers_1.generateId({
            directory: compilationConfig["working_directory"]
        });
        // setting up a fake previous contract to test previous name record
        const { data: { workspace: { projectsAdd: { projects } } } } = yield db.query(projects_1.AddProjects, {
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
        let previousContractAdded = yield db.query(contracts_1.AddContracts, {
            contracts: [previousContract]
        });
        previousContractExpectedId = helpers_1.generateId({
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
        const contractNameRecord = yield db.query(nameRecords_1.AddNameRecords, {
            nameRecords: [previousContractNameRecord]
        });
        contractNameRecordId =
            contractNameRecord.data.workspace.nameRecordsAdd.nameRecords[0].id;
        let setContractHead = yield db.query(projects_1.AssignProjectNames, {
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
        const loader = new artifactsLoader_1.ArtifactsLoader(db, compilationConfig);
        yield loader.load();
    }), 10000);
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield Promise.all(artifacts.map((contract, index) => __awaiter(void 0, void 0, void 0, function* () {
            const migratedArtifactPath = fse
                .readFileSync(path_1.default.join(__dirname, "compilationSources", "build", "contracts", migrationFileNames[index]))
                .toString();
            let migratedArtifact = JSON.parse(migratedArtifactPath);
            migratedArtifact.networks = {};
            migratedArtifact.updatedAt = "";
            migratedArtifact.schemaVersion = "3.0.11";
            fse.removeSync(path_1.default.join(__dirname, "compilationSources", "build", "contracts", migrationFileNames[index]));
            fse.outputFileSync(path_1.default.join(__dirname, "compilationSources", "build", "contracts", migrationFileNames[index]), JSON.stringify(migratedArtifact, null, 2));
        })));
    }));
    it("loads compilations", () => __awaiter(void 0, void 0, void 0, function* () {
        const compilationsQuery = yield Promise.all(compilationIds.map(compilationId => {
            let compilation = db.query(GetWorkspaceCompilation, compilationId);
            return compilation;
        }));
        const solcCompilation = compilationsQuery[0].data.workspace.compilation;
        expect(solcCompilation.compiler.version).toEqual(artifacts[0].compiler.version);
        expect(solcCompilation.sources.length).toEqual(3);
        solcCompilation.sources.map((source, index) => {
            expect(source.id).toEqual(sourceIds[index].id);
            expect(source["contents"]).toEqual(artifacts[index].source);
            expect(solcCompilation.processedSources[index].source.contents).toEqual(artifacts[index].source);
            expect(solcCompilation.sourceMaps.find(({ json }) => json === artifacts[index].sourceMap)).toBeDefined();
        });
        const vyperCompilation = compilationsQuery[1].data.workspace.compilation;
        expect(vyperCompilation.compiler.version).toEqual(artifacts[3].compiler.version);
        expect(vyperCompilation.sources.length).toEqual(1);
        expect(vyperCompilation.sources[0].id).toEqual(sourceIds[3].id);
        expect(vyperCompilation.sources[0].contents).toEqual(artifacts[3].source);
        expect(vyperCompilation.processedSources[0].source.contents).toEqual(artifacts[3].source);
    }));
    it("loads contract sources", () => __awaiter(void 0, void 0, void 0, function* () {
        for (let index in sourceIds) {
            let { data: { workspace: { source: { contents, sourcePath } } } } = yield db.query(GetWorkspaceSource, sourceIds[index]);
            expect(contents).toEqual(artifacts[index].source);
            expect(sourcePath).toEqual(artifacts[index].sourcePath);
        }
    }));
    it("loads bytecodes", () => __awaiter(void 0, void 0, void 0, function* () {
        for (let index in bytecodeIds) {
            let { data: { workspace: { bytecode: { bytes } } } } = yield db.query(GetWorkspaceBytecode, bytecodeIds[index]);
            let shimmedBytecode = shims_1.shimBytecode(artifacts[index].bytecode);
            expect(bytes).toEqual(shimmedBytecode.bytes);
        }
    }));
    it("loads contracts", () => __awaiter(void 0, void 0, void 0, function* () {
        let contractIds = [];
        for (let index in artifacts) {
            let expectedId = helpers_1.generateId({
                name: artifacts[index].contractName,
                abi: { json: JSON.stringify(artifacts[index].abi) },
                processedSource: {
                    index: artifacts[index].compiler.name === "solc" ? +index : 0
                },
                compilation: {
                    id: artifacts[index].compiler.name === "solc"
                        ? expectedSolcCompilationId
                        : expectedVyperCompilationId
                }
            });
            contractNameRecordId =
                artifacts[index].contractName === previousContractNameRecord.name
                    ? helpers_1.generateId({
                        name: artifacts[index].contractName,
                        type: "Contract",
                        resource: {
                            id: expectedId
                        },
                        previous: {
                            id: previousContractExpectedId
                        }
                    })
                    : helpers_1.generateId({
                        name: artifacts[index].contractName,
                        type: "Contract",
                        resource: {
                            id: expectedId
                        }
                    });
            contractIds.push({ id: expectedId });
            let { data: { workspace: { contract: { id, name, processedSource: { source: { contents } }, compilation: { compiler: { version } }, createBytecode, callBytecode } } } } = yield db.query(GetWorkspaceContract, contractIds[index]);
            const artifactsCreateBytecode = shims_1.shimBytecode(artifacts[index].bytecode);
            expect(createBytecode.bytes).toEqual(artifactsCreateBytecode.bytes);
            const artifactsCallBytecode = shims_1.shimBytecode(artifacts[index].deployedBytecode);
            expect(callBytecode.bytes).toEqual(artifactsCallBytecode.bytes);
            expect(name).toEqual(artifacts[index].contractName);
            expect(contents).toEqual(artifacts[index].source);
            expect(version).toEqual(artifacts[index].compiler.version);
            expect(id).toEqual(contractIds[index].id);
            const { data: { workspace: { project: { resolve } } } } = yield db.query(projects_1.ResolveProjectName, {
                projectId,
                name: artifacts[index].contractName,
                type: "Contract"
            });
            const nameRecord = resolve[0];
            expect(nameRecord.resource.id).toEqual(contractIds[index].id);
        }
    }));
    it("loads networks", () => __awaiter(void 0, void 0, void 0, function* () {
        for (let index in migratedArtifacts) {
            let { data: { workspace: { network: { name, networkId, historicBlock } } } } = yield db.query(GetWorkspaceNetwork, netIds[index]);
            expect(name).toEqual("development");
            expect(networkId).toEqual(migratedNetworks[index]["networkId"]);
            expect(historicBlock).toEqual(migratedNetworks[index]["historicBlock"]);
        }
    }));
    it("loads contract instances", () => __awaiter(void 0, void 0, void 0, function* () {
        for (const contractInstanceId of contractInstanceIds) {
            let { data: { workspace: { contractInstance: { address, network: { networkId }, contract: { name }, creation: { transactionHash, constructor: { createBytecode: { bytecode: { bytes, linkReferences } } } }, callBytecode: { bytecode } } } } } = yield db.query(GetWorkspaceContractInstance, contractInstanceId);
            const contractInstance = contractInstances.find(contractInstance => name === contractInstance.contract.name);
            expect(contractInstance).toBeDefined();
            expect(name).toEqual(contractInstance.contract.name);
            expect(networkId).toEqual(contractInstance.network.networkId);
            expect(address).toEqual(contractInstance.address);
            expect(transactionHash).toEqual(contractInstance.creation.transactionHash);
            expect(bytes).toEqual(contractInstance.creation.constructor.createBytecode.bytecode.bytes);
            expect(linkReferences).toEqual(contractInstance.creation.constructor.createBytecode.bytecode
                .linkReferences);
            expect(bytecode.bytes).toEqual(contractInstance.callBytecode.bytecode.bytes);
        }
    }));
});
//# sourceMappingURL=index.js.map