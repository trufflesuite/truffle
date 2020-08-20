"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function () {
            return m[k];
          }
        });
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactsLoader = void 0;
const Contracts = __importStar(require("@truffle/workflow-compile/new"));
const fse = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("@truffle/config"));
const environment_1 = require("@truffle/environment");
const web3_1 = __importDefault(require("web3"));
const compilations_1 = require("@truffle/db/loaders/resources/compilations");
const contractInstances_1 = require("@truffle/db/loaders/resources/contractInstances");
const nameRecords_1 = require("@truffle/db/loaders/resources/nameRecords");
const networks_1 = require("@truffle/db/loaders/resources/networks");
const projects_1 = require("@truffle/db/loaders/resources/projects");
class ArtifactsLoader {
  constructor(db, config) {
    this.db = db;
    this.config = config;
  }
  load() {
    return __awaiter(this, void 0, void 0, function* () {
      const result = yield Contracts.compile(this.config);
      const { project, compilations } = yield this.db.loadCompilations(result);
      //map contracts and contract instances to compiler
      yield Promise.all(
        compilations.map(({ id }) =>
          __awaiter(this, void 0, void 0, function* () {
            const {
              data: {
                workspace: {
                  compilation: { compiler, processedSources }
                }
              }
            } = yield this.db.query(compilations_1.GetCompilation, { id });
            const networks = yield this.loadNetworks(
              project.id,
              result.compilations[compiler.name].contracts,
              this.config["artifacts_directory"],
              this.config["contracts_directory"]
            );
            const processedSourceContracts = processedSources
              .map(processedSource => processedSource.contracts)
              .flat();
            const contracts = result.compilations[
              compiler.name
            ].contracts.map(({ contractName }) =>
              processedSourceContracts.find(({ name }) => name === contractName)
            );
            if (networks[0].length) {
              yield this.loadContractInstances(contracts, networks);
            }
          })
        )
      );
    });
  }
  loadNameRecords(projectId, nameRecords) {
    return __awaiter(this, void 0, void 0, function* () {
      const nameRecordsResult = yield this.db.query(
        nameRecords_1.AddNameRecords,
        {
          nameRecords: nameRecords
        }
      );
      let {
        data: {
          workspace: { nameRecordsAdd }
        }
      } = nameRecordsResult;
      const projectNames = nameRecordsAdd.nameRecords.map(
        ({ id: nameRecordId, name, type }) => ({
          project: { id: projectId },
          nameRecord: { id: nameRecordId },
          name,
          type
        })
      );
      //set new projectNameHeads based on name records added
      const projectNamesResult = yield this.db.query(
        projects_1.AssignProjectNames,
        {
          projectNames
        }
      );
    });
  }
  resolveProjectName(projectId, type, name) {
    return __awaiter(this, void 0, void 0, function* () {
      let { data } = yield this.db.query(projects_1.ResolveProjectName, {
        projectId,
        type,
        name
      });
      if (data.workspace.project.resolve.length > 0) {
        return {
          id: data.workspace.project.resolve[0].id
        };
      }
    });
  }
  loadNetworks(projectId, contracts, artifacts, workingDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
      const networksByContract = yield Promise.all(
        contracts.map(({ contractName, bytecode }) =>
          __awaiter(this, void 0, void 0, function* () {
            const name = contractName.toString().concat(".json");
            const artifactsNetworksPath = fse.readFileSync(
              path_1.default.join(artifacts, name)
            );
            const artifactsNetworks = JSON.parse(
              artifactsNetworksPath.toString()
            ).networks;
            let configNetworks = [];
            if (Object.keys(artifactsNetworks).length) {
              const config = config_1.default.detect({
                workingDirectory: workingDirectory
              });
              for (let network of Object.keys(config.networks)) {
                config.network = network;
                yield environment_1.Environment.detect(config);
                let networkId;
                let web3;
                try {
                  web3 = new web3_1.default(config.provider);
                  networkId = yield web3.eth.net.getId();
                } catch (err) {}
                if (networkId) {
                  let filteredNetwork = Object.entries(
                    artifactsNetworks
                  ).filter(network => network[0] == networkId);
                  //assume length of filteredNetwork is 1 -- shouldn't have multiple networks with same id in one contract
                  if (filteredNetwork.length > 0) {
                    const transaction = yield web3.eth.getTransaction(
                      filteredNetwork[0][1]["transactionHash"]
                    );
                    const historicBlock = {
                      height: transaction.blockNumber,
                      hash: transaction.blockHash
                    };
                    const networksAdd = yield this.db.query(
                      networks_1.AddNetworks,
                      {
                        networks: [
                          {
                            name: network,
                            networkId: networkId,
                            historicBlock: historicBlock
                          }
                        ]
                      }
                    );
                    const id =
                      networksAdd.data.workspace.networksAdd.networks[0].id;
                    configNetworks.push({
                      contract: contractName,
                      id: id,
                      address: filteredNetwork[0][1]["address"],
                      transactionHash: filteredNetwork[0][1]["transactionHash"],
                      bytecode: bytecode,
                      links: filteredNetwork[0][1]["links"],
                      name: network
                    });
                  }
                }
              }
            }
            const nameRecords = yield Promise.all(
              configNetworks.map((network, index) =>
                __awaiter(this, void 0, void 0, function* () {
                  //check if there is already a current head for this item. if so save it as previous
                  let current = yield this.resolveProjectName(
                    projectId,
                    "Network",
                    network.name
                  );
                  return {
                    name: network.name,
                    type: "Network",
                    resource: {
                      id: configNetworks[index].id
                    },
                    previous: current
                  };
                })
              )
            );
            yield this.loadNameRecords(projectId, nameRecords);
            return configNetworks;
          })
        )
      );
      return networksByContract;
    });
  }
  getNetworkLinks(network, bytecode) {
    let networkLink = [];
    if (network.links) {
      networkLink = Object.entries(network.links).map(link => {
        let linkReferenceIndexByName = bytecode.linkReferences.findIndex(
          ({ name }) => name === link[0]
        );
        let linkValue = {
          value: link[1],
          linkReference: {
            bytecode: bytecode.id,
            index: linkReferenceIndexByName
          }
        };
        return linkValue;
      });
    }
    return networkLink;
  }
  loadContractInstances(contracts, networksArray) {
    return __awaiter(this, void 0, void 0, function* () {
      // networksArray is an array of arrays of networks for each contract;
      // this first mapping maps to each contract
      const instances = networksArray.map((networks, index) => {
        // this second mapping maps each network in a contract
        const contractInstancesByNetwork = networks.map(network => {
          let createBytecodeLinkValues = this.getNetworkLinks(
            network,
            contracts[index].createBytecode
          );
          let callBytecodeLinkValues = this.getNetworkLinks(
            network,
            contracts[index].callBytecode
          );
          let instance = {
            address: network.address,
            contract: {
              id: contracts[index].id
            },
            network: {
              id: network.id
            },
            creation: {
              transactionHash: network.transactionHash,
              constructor: {
                createBytecode: {
                  bytecode: { id: contracts[index].createBytecode.id },
                  linkValues: createBytecodeLinkValues
                }
              }
            },
            callBytecode: {
              bytecode: { id: contracts[index].callBytecode.id },
              linkValues: callBytecodeLinkValues
            }
          };
          return instance;
        });
        return contractInstancesByNetwork;
      });
      yield this.db.query(contractInstances_1.AddContractInstances, {
        contractInstances: instances.flat()
      });
    });
  }
}
exports.ArtifactsLoader = ArtifactsLoader;
//# sourceMappingURL=artifactsLoader.js.map
