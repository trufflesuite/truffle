import gql from "graphql-tag";
import { TruffleDB } from "truffle-db/db";
import * as Contracts from "truffle-workflow-compile";
import { generateId } from "truffle-db/helpers";

const GetContractNames = gql`
query GetContractNames {
  artifacts {
    contractNames
  }
}
`;

const GetBytecode = gql`
query GetBytecode($name: String!) {
  artifacts {
    contract(name: $name) {
      constructor {
        createBytecode {
          bytes
        }
      }
    }
  }
}
`;

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

const GetSource = gql`
query GetSource($name: String!) {
  artifacts {
    contract(name: $name) {
      sourceContract {
        source {
          contents
          sourcePath
        }
      }
    }
  }
}
`;

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

export class ArtifactsLoader {
  private db: TruffleDB;
  private config: object;

  constructor (db: TruffleDB, config?: object) {
    this.db = db;
    this.config = config;
  }

  async load (): Promise<void> {
    const {
      data: {
        artifacts: {
          contractNames
        }
      }
    } = await this.db.query(GetContractNames);


    await this.loadCompilation(this.config);
  }

  async loadCompilationContracts(compilation: object, compilationId: string) {
    let contracts = [];
    let contractIds = [];
    for(let contract in compilation) {
      let contractObject = {
        name: compilation[contract]["contract_name"],
        abi: {
          json: JSON.stringify(compilation[contract]["abi"])
        },
        compilation: {
          id: compilationId
        },
        sourceContract: {
          index: +contract
        },
        constructor: {
          createBytecode: { id: generateId({ bytes: compilation[contract]["bytecode"] }) }
        }
      };

      contracts.push(contractObject);
    }

    await this.db.query(AddContracts, { contracts });

  }
  async loadCompilationBytecodes(compilation: object) {
    let bytecodes = [];
    for(let contract in compilation) {
      let bytecodeObject = {
        bytes: compilation[contract]["bytecode"]
      };

      let bytecodeId = generateId({ bytes: compilation[contract]["bytecode"] })

      bytecodes.push(bytecodeObject);
    }

    await this.db.query(AddBytecodes, { bytecodes });
  }
  async loadCompilationSources(compilation: object) {
    let sources = [];
    let sourceIds = [];
    for(let contract in compilation) {
      let sourceObject = {
        contents: compilation[contract]["source"],
        sourcePath: compilation[contract]["sourcePath"]
      };

      let sourceId = generateId({
        contents: compilation[contract]["source"],
        sourcePath: compilation[contract]["sourcePath"]
      });

      sources.push(sourceObject);
      sourceIds.push({id: sourceId});
    }

    await this.db.query(AddSources, { sources: sources });
    return sourceIds;
  }

  async compilationSourceContracts(compilation: object) {
    let sourceContracts = [];
    for(let contract in compilation) {
      let sourceContract =
      {
        name: compilation[contract]["contract_name"],
        source: {
          id: generateId({
            contents: compilation[contract]["source"],
            sourcePath: compilation[contract]["sourcePath"]
          })
        },
        ast: {
          json: JSON.stringify(compilation[contract]["ast"]),
        }
      }
      sourceContracts.push(sourceContract);
    }

    return sourceContracts;
  }

  async loadCompilation(compilationConfig: object) {
    let compilationsArray = [];
    let sources = [];

    const compilationOutput = await Contracts.compile(compilationConfig);
    const compilationData = Object.values(compilationOutput.contracts);
    let sourceIds = await this.loadCompilationSources(compilationData);
    await this.loadCompilationBytecodes(compilationData);
    let sourceContracts = await this.compilationSourceContracts(compilationData);
    let compilationObject = {
      compiler: {
        name: compilationData[0]["compiler"]["name"],
        version: compilationData[0]["compiler"]["version"]
      },
      contracts: sourceContracts,
      sources: sourceIds
    }

    const compilation = await this.db.query(AddCompilation, { compilations: [compilationObject] });
    await this.loadCompilationContracts(compilationData, compilation.data.workspace.compilationsAdd.compilations[0].id);
  }
}
