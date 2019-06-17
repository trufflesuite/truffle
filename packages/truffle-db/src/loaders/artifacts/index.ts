import gql from "graphql-tag";
import { TruffleDB } from "truffle-db/db";
import * as Contracts from "truffle-workflow-compile";
import { ContractObject } from "truffle-contract-schema/spec";

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
            networkID
          }
        }
      }
    }
  }
`;

const AddNetworks = gql`
  input NetworkInput {
    name: String
    networkID: NetworkID!
    historicBlock: BlockInput
    fork: NetworkInput
  }

  mutation AddNetworks($networks: [NetworkInput!]!) {
    workspace {
      networksAdd(input: {
        networks: $networks
      }) {
        networks {
          id
          networkID
          historicBlock
          fork
        }
      }
    }
  }
`;

type WorkflowCompileResult = {
  outputs: { [compilerName: string]: string[] },
  contracts: { [contractName: string]: ContractObject }
};

export class ArtifactsLoader {
  private db: TruffleDB;
  private config: object;

  constructor (db: TruffleDB, config?: object) {
    this.db = db;
    this.config = config;
  }

  async load (): Promise<void> {
    await this.loadCompilation(this.config);
  }

  async loadCompilationContracts(contracts: Array<ContractObject>, compilationId:string, compilerName:string) {
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

  async loadCompilationBytecodes(contracts: Array<ContractObject>) {
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

  async loadCompilationSources(contracts: Array<ContractObject>) {
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

  async compilationSourceContracts(compilation: Array<ContractObject>, sourceIds: Array<object>) {
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

  async setCompilation(organizedCompilation: Array<ContractObject>) {
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

  async loadNetworks(contracts: Array<ContractObject>) {
    const networks = contracts.map(({ networks }) => {
      return Object.entries(networks).map((network) => {
        let networkObject = {
          networkID: network[0]
        }
        return networkObject;
      });
    });

    const networksAdded = await Promise.all(networks.map(async (networkObjects) => {
      return this.db.query(AddNetworks, { networks: networkObjects });
    }));

    return networksAdded;
  }

  async loadContractInstances(contracts: Array<ContractObject>, contractIds: Array<object>, networksArray: Array<object>) {
    const contractInstances = contracts.map(({ networks }, index) => {
      //each network needs its own contract instance
      const instancesByNetwork =  Object.entries(networks).map((network, additionalIndex) => {
        let networkId = networksArray[index]["data"]["workspace"]["networksAdd"]["networks"][additionalIndex].id
        let instance = {
          address: network[1].address,
          contract: contractIds[index],
          network: {
            id: networkId
          }
        }
        return instance;
      });
      return instancesByNetwork;
    });
    // contractInstances is a multidimensional array because we mapped twice.
    // Passing a flattened version to the query
    await this.db.query(AddContractInstances, { contractInstances: contractInstances.flat() });
  }

  async loadCompilation(compilationConfig: object) {
    const compilationOutput = await Contracts.compile(compilationConfig);
    const contracts = await this.organizeContractsByCompiler(compilationOutput);

    const compilationObjects = await Promise.all(Object.values(contracts)
      .filter(contractsArray => contractsArray.length > 0)
      .map(contractsArray => this.setCompilation(contractsArray)));


    const compilations = await this.db.query(AddCompilation, { compilations: compilationObjects });

    //map contracts and contract instances to compiler
    await Promise.all(compilations.data.workspace.compilationsAdd.compilations.map(async ({compiler, id}) => {
      const contractIds = await this.loadCompilationContracts(contracts[compiler.name], id, compiler.name);
      const networks = await this.loadNetworks(contracts[compiler.name]);
      if(networks[0]["data"]["workspace"]["networksAdd"]["networks"].length) {
        this.loadContractInstances(contracts[compiler.name], contractIds.contractIds, networks);
      }
    }))
  }
}
