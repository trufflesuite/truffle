import { TruffleDB } from "@truffle/db/db";
import * as fse from "fs-extra";
import path from "path";
import Config from "@truffle/config";
import { Environment } from "@truffle/environment";
import Web3 from "web3";

import { GetCompilation } from "@truffle/db/loaders/resources/compilations";
import { AddContractInstances } from "@truffle/db/loaders/resources/contractInstances";
import { AddNameRecords } from "@truffle/db/loaders/resources/nameRecords";
import { AddNetworks } from "@truffle/db/loaders/resources/networks";
import {
  AssignProjectNames,
  ResolveProjectName
} from "@truffle/db/loaders/resources/projects";
import {
  WorkflowCompileResult,
  CompiledContract
} from "@truffle/compile-common/src/types";

type NetworkLinkObject = {
  [name: string]: string;
};

type LinkValueLinkReferenceObject = {
  bytecode: string;
  index: number;
};

type LinkValueObject = {
  value: string;
  linkReference: LinkValueLinkReferenceObject;
};

type LoaderNetworkObject = {
  contract: string;
  id: string;
  address: string;
  transactionHash: string;
  links?: NetworkLinkObject;
};

type LinkReferenceObject = {
  offsets: Array<number>;
  name: string;
  length: number;
};

type BytecodeInfo = {
  id: string;
  linkReferences: Array<LinkReferenceObject>;
  bytes?: string;
};

type IdObject = {
  id: string;
};

type CompilationConfigObject = {
  contracts_directory?: string;
  contracts_build_directory?: string;
  artifacts_directory?: string;
  working_directory?: string;
  all?: boolean;
};

type NameRecordObject = {
  name: string;
  type: string;
  resource: IdObject;
  previous?: IdObject;
};

export class ArtifactsLoader {
  private db: TruffleDB;
  private config: CompilationConfigObject;

  constructor(db: TruffleDB, config?: CompilationConfigObject) {
    this.db = db;
    this.config = config;
  }

  async load(result: WorkflowCompileResult): Promise<void> {
    const { project, compilations } = await this.db.loadCompilations(result);

    //map contracts and contract instances to compiler
    await Promise.all(
      compilations.map(async ({ id }, index) => {
        const {
          data: {
            workspace: {
              compilation: { processedSources }
            }
          }
        } = await this.db.query(GetCompilation, { id });

        const networks = await this.loadNetworks(
          project.id,
          result.compilations[index].contracts,
          this.config["contracts_build_directory"],
          this.config["contracts_directory"]
        );

        const processedSourceContracts = processedSources
          .map(processedSource => processedSource.contracts)
          .flat();

        let contracts = [];
        result.compilations[index].contracts.map(({ contractName }) =>
          contracts.push(
            processedSourceContracts.find(({ name }) => name === contractName)
          )
        );

        if (networks[0].length) {
          await this.loadContractInstances(contracts, networks);
        }
      })
    );
  }

  async loadNameRecords(projectId: string, nameRecords: NameRecordObject[]) {
    const nameRecordsResult = await this.db.query(AddNameRecords, {
      nameRecords: nameRecords
    });
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
    await this.db.query(AssignProjectNames, {
      projectNames
    });
  }

  async resolveProjectName(projectId: string, type: string, name: string) {
    let { data } = await this.db.query(ResolveProjectName, {
      projectId,
      type,
      name
    });

    if (data.workspace.project.resolve.length > 0) {
      return {
        id: data.workspace.project.resolve[0].id
      };
    }
  }

  async loadNetworks(
    projectId: string,
    contracts: Array<CompiledContract>,
    artifacts: string,
    workingDirectory: string
  ) {
    const networksByContract = await Promise.all(
      contracts.map(async ({ contractName, bytecode }) => {
        const name = contractName.toString().concat(".json");
        const artifactsNetworksPath = fse.readFileSync(
          path.join(artifacts, name)
        );
        const artifactsNetworks = JSON.parse(artifactsNetworksPath.toString())
          .networks;
        let configNetworks = [];
        if (Object.keys(artifactsNetworks).length) {
          const config = Config.detect({ workingDirectory: workingDirectory });
          for (let network of Object.keys(config.networks)) {
            config.network = network;
            await Environment.detect(config);
            let networkId;
            let web3;
            try {
              web3 = new Web3(config.provider);
              networkId = await web3.eth.net.getId();
            } catch (err) {}

            if (networkId) {
              let filteredNetwork = Object.entries(artifactsNetworks).filter(
                network => network[0] == networkId
              );
              //assume length of filteredNetwork is 1 -- shouldn't have multiple networks with same id in one contract
              if (filteredNetwork.length > 0) {
                const transaction = await web3.eth.getTransaction(
                  filteredNetwork[0][1]["transactionHash"]
                );
                const historicBlock = {
                  height: transaction.blockNumber,
                  hash: transaction.blockHash
                };

                const networksAdd = await this.db.query(AddNetworks, {
                  networks: [
                    {
                      name: network,
                      networkId: networkId,
                      historicBlock: historicBlock
                    }
                  ]
                });

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

        const nameRecords = await Promise.all(
          configNetworks.map(async (network, index) => {
            //check if there is already a current head for this item. if so save it as previous
            let current: IdObject = await this.resolveProjectName(
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
        );

        await this.loadNameRecords(projectId, nameRecords);

        return configNetworks;
      })
    );
    return networksByContract;
  }

  getNetworkLinks(network: LoaderNetworkObject, bytecode: BytecodeInfo) {
    let networkLink: Array<LinkValueObject> = [];
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

  async loadContractInstances(
    contracts: Array<DataModel.IContract>,
    networksArray: Array<Array<LoaderNetworkObject>>
  ) {
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

    await this.db.query(AddContractInstances, {
      contractInstances: instances.flat()
    });
  }
}
