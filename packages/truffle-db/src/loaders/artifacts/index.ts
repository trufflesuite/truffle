import gql from "graphql-tag";
import { TruffleDB } from "truffle-db/db";
import * as Contracts from "truffle-workflow-compile";
import { ContractObject } from "truffle-contract-schema/spec";
import * as fse from "fs-extra";
import path from "path";
import * as Config from "truffle-config";
import { Environment } from "truffle-environment";
import Web3 from "web3";


const AddBytecodes = gql`
input BytecodeInput {
  bytes: Bytes!
}

mutation AddBytecodes($bytecodes: [BytecodeInput!]!) {
  workspace {
    bytecodesAdd(input: {
      bytecodes: $bytecodes
    }) {
      bytecodes {
        id
      }
    }
  }
}`;

const AddSources = gql`
input SourceInput {
  contents: String!
  sourcePath: String
}

mutation AddSource($sources: [SourceInput!]!) {
  workspace {
    sourcesAdd(input: {
      sources: $sources
    }) {
      sources {
        id
        contents
        sourcePath
      }
    }
  }
}`;

const AddCompilation = gql`
input CompilerInput {
  name: String
  version: String
  settings: Object
}

input CompilationSourceInput {
  id: ID!
}

input CompilationSourceContractSourceInput {
  id: ID!
}

input CompilationSourceContractAstInput {
  json: String!
}

input CompilationSourceContractInput {
  name: String
  source: CompilationSourceContractSourceInput
  ast: CompilationSourceContractAstInput
}

input CompilationInput {
    compiler: CompilerInput!
    contracts: [CompilationSourceContractInput!]
    sources: [CompilationSourceInput!]!
}
input CompilationsAddInput {
  compilations: [CompilationInput!]!
}


mutation AddCompilation($compilations: [CompilationInput!]!) {
  workspace {
    compilationsAdd(input: {
      compilations: $compilations
    }) {
      compilations {
        id
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
  }
}
`;

const AddContracts = gql`
  input AbiInput {
    json: String!
    items: [String]
  }
  input ContractCompilationInput {
    id: ID!
  }
  input ContractSourceContractInput {
    index: FileIndex
  }
  input ContractConstructorBytecodeInput {
    id: ID!
  }
  input ContractConstructorInput {
    createBytecode: ContractConstructorBytecodeInput!
  }
  input ContractInput {
    name: String
    abi: AbiInput
    compilation: ContractCompilationInput
    sourceContract: ContractSourceContractInput
    constructor: ContractConstructorInput
  }
  mutation AddContracts($contracts: [ContractInput!]!) {
    workspace {
      contractsAdd(input: {
        contracts: $contracts
      }) {
        contracts {
          id
          name
          abi {
            json
          }
          sourceContract {
            name
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
          constructor {
            createBytecode {
              bytes
            }
          }
        }
      }
    }
  }
`;

const AddContractInstances = gql`
  input ContractInstanceNetworkInput {
    id: ID!
  }

  input ContractInstanceContractInput {
    id: ID!
  }

  input ContractInstanceInput {
    address: Address!
    network: ContractInstanceNetworkInput!
    contract: ContractInstanceContractInput
  }

  mutation AddContractInstances($contractInstances: [ContractInstanceInput!]!) {
    workspace {
      contractInstancesAdd(input: {
        contractInstances: $contractInstances
      }) {
        contractInstances {
          address
          network {
            name
            networkID
            historicBlock
          }
          contract {
            name
          }
        }
      }
    }
  }
`;

const AddNetworks = gql`
  input HistoricBlockInput {
    height: Int!
    hash: String!
  }

  input NetworkIdInput {
    id: ID!
  }

  input NetworkInput {
    name: String
    networkId: NetworkId!
    historicBlock: HistoricBlockInput!
    fork: NetworkIdInput
  }

  mutation AddNetworks($networks: [NetworkInput!]!) {
    workspace {
      networksAdd(input: {
        networks: $networks
      }) {
        networks {
          id
          networkId
          historicBlock {
            height
            hash
          }
          fork
        }
      }
    }
  }
`;

const GetNetworkById = gql`
  query GetWorkspaceNetworkById($networkId: NetworkId!) {
    workspace {
      networkById(networkId: $networkId) {
        id
        name
        networkId
        historicBlock {
          height
          hash
        }
        fork
      }
    }
  }
`;



type WorkflowCompileResult = {
  outputs: { [compilerName: string]: string[] },
  contracts: { [contractName: string]: ContractObject }
};

type LoaderNetworkObject = {
  contract: string,
  id: string,
  address: string
}

type IdObject = {
  id: string
}

type CompilationConfigObject = {
  contracts_directory?: string,
  contracts_build_directory?: string,
  artifacts_directory?: string,
  all?: boolean
}

export class ArtifactsLoader {
  private db: TruffleDB;
  private config: object;

  constructor (db: TruffleDB, config?: CompilationConfigObject) {
    this.db = db;
    this.config = config;
  }

  async load (): Promise<void> {
    const compilationsOutput = await this.loadCompilation(this.config);
    const { compilations, contracts } = compilationsOutput;

    //map contracts and contract instances to compiler
    await Promise.all(compilations.data.workspace.compilationsAdd.compilations.map(async ({compiler, id}) => {
      const contractIds = await this.loadCompilationContracts(contracts[compiler.name], id, compiler.name);
      const networks = await this.loadNetworks(contracts[compiler.name], this.config["artifacts_directory"], this.config["contracts_directory"]);
      if(networks[0].length) {
        this.loadContractInstances(contracts[compiler.name], contractIds.contractIds, networks);
      }
    }))
  }

  async loadCompilationContracts (contracts: Array<ContractObject>, compilationId: string, compilerName: string) {
    const bytecodeIds = await this.loadCompilationBytecodes(contracts);
    const contractObjects = contracts.map((contract, index) => ({
      name: contract["contract_name"],
      abi: {
        json: JSON.stringify(contract["abi"])
      },
      compilation: {
        id: compilationId
      },
      sourceContract: {
        index: index
      },
      constructor: {
        createBytecode: bytecodeIds[index]
      }
    }));

    const contractsLoaded = await this.db.query(AddContracts, { contracts: contractObjects});
    const contractIds = contractsLoaded.data.workspace.contractsAdd.contracts.map( ({ id }) => ({ id }) );

    return { compilerName: contracts[0].compiler.name, contractIds: contractIds };

  }

  async loadCompilationBytecodes (contracts: Array<ContractObject>) {
    // transform contract objects into data model bytecode inputs
    // and run mutation
    const result = await this.db.query(AddBytecodes, {
      bytecodes: contracts.map(
        ({ bytecode }) => ({ bytes: bytecode })
      )
    });
    const bytecodeIds = result.data.workspace.bytecodesAdd.bytecodes

    return bytecodeIds;
  }

  async loadCompilationSources (contracts: Array<ContractObject>) {
    // transform contract objects into data model source inputs
    // and run mutation
    const result = await this.db.query(AddSources, {
      sources: contracts.map(
        ({ source, sourcePath }) => ({ contents: source, sourcePath })
      )
    });

    // extract sources
    const sources = result.data.workspace.sourcesAdd.sources;

    // return only array of objects { id }
    return sources.map( ({ id }) => ({ id }) );
  }

  async compilationSourceContracts (compilation: Array<ContractObject>, sourceIds: Array<IdObject>) {
    return compilation.map(({ contract_name: name, ast }, index) => ({
      name,
      source: sourceIds[index],
      ast: ast ? { json: JSON.stringify(ast) } : undefined
    }));
  }

  async organizeContractsByCompiler (result: WorkflowCompileResult) {
    const { outputs, contracts } = result;

    return Object.entries(outputs)
      .map( ([compilerName, sourcePaths]) => ({
        [compilerName]: sourcePaths.map(
          (sourcePath) => Object.values(contracts)
            .filter( (contract) => contract.sourcePath === sourcePath)
            [0] || undefined
        )
      }))
      .reduce((a, b) => ({ ...a, ...b }), {});
  }

  async setCompilation (organizedCompilation: Array<ContractObject>) {
    const sourceIds = await this.loadCompilationSources(organizedCompilation);
    const sourceContracts = await this.compilationSourceContracts(organizedCompilation, sourceIds);
    const compilationObject = {
      compiler: {
        name: organizedCompilation[0]["compiler"]["name"],
        version: organizedCompilation[0]["compiler"]["version"]
      },
      contracts: sourceContracts,
      sources: sourceIds
    }

    return compilationObject;
  }

  async loadNetworks (contracts: Array<ContractObject>, artifacts:string, workingDirectory:string) {
    const networksByContract = await Promise.all(contracts.map(async ({ contract_name })=> {
      const contractName = contract_name.toString().concat('.json');
      const artifactsNetworks = JSON.parse(await fse.readFile(path.join(artifacts,contractName))).networks;
      let configNetworks = [];
      if(Object.keys(artifactsNetworks).length) {
        const config = Config.detect({ workingDirectory: workingDirectory });
        for(let network of Object.keys(config.networks)) {
           config.network = network;
           await Environment.detect(config);
           let networkId;
           let web3;
           try {
            web3 = new Web3(config.provider);
            networkId = await web3.eth.net.getId();
          }
          catch(err) {}

          if(networkId) {
            let filteredNetwork = Object.entries(artifactsNetworks).filter((network) => network[0] == networkId);
            //assume length of filteredNetwork is 1 -- shouldn't have multiple networks with same id in one contract
            if(filteredNetwork.length > 0) {
              const transaction = await web3.eth.getTransaction(filteredNetwork[0][1]["transactionHash"]);
              const historicBlock = {
                height: transaction.blockNumber,
                hash: transaction.blockHash
              }

              const networksAdd = await this.db.query(AddNetworks,
              {
                networks:
                [{
                  name: network,
                  networkId: networkId,
                  historicBlock: historicBlock
                }]
              });

              const id = networksAdd.data.workspace.networksAdd.networks[0].id;
              configNetworks.push({
                contract: contractName,
                id: id,
                address: filteredNetwork[0][1]["address"]
              });
            }
          }
        }
      }
      return configNetworks;
    }));
    return networksByContract;
  }

  async loadContractInstances (contracts: Array<ContractObject>, contractIds: Array<IdObject>, networksArray: Array<Array<LoaderNetworkObject>>) {
    // networksArray is an array of arrays of networks for each contract;
    // this first mapping maps to each contract
    const instances = networksArray.map((networks, index) => {
      // this second mapping maps each network in a contract
      const contractInstancesByNetwork = networks.map((network) => {
        let instance = {
          address: network.address,
          contract: contractIds[index],
          network: {
            id: network.id
          }
        }
        return instance;
      });

      return contractInstancesByNetwork;
    });

    await this.db.query(AddContractInstances, { contractInstances: instances.flat() });
  }

  async loadCompilation (compilationConfig: CompilationConfigObject) {
    const compilationOutput = await Contracts.compile(compilationConfig);
    const contracts = await this.organizeContractsByCompiler(compilationOutput);
    const compilationObjects = await Promise.all(Object.values(contracts)
      .filter(contractsArray => contractsArray.length > 0)
      .map(contractsArray => this.setCompilation(contractsArray)));


    const compilations = await this.db.query(AddCompilation, { compilations: compilationObjects });

    return { compilations, contracts };
  }
}
