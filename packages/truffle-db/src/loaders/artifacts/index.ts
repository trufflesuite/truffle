import gql from "graphql-tag";

import { TruffleDB } from "truffle-db/db";

import * as Contracts from "truffle-workflow-compile";

import { generateId } from "test/helpers";

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

const AddCompilations = gql`
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
    }
  }
  }
}`

const GetWorkspaceSource = gql`
query GetWorkspaceSource($id: ID!) {
  workspace {
    source(id: $id) {
      id
      contents
    }
  }
}`;

const GetWorkspaceCompilation = gql`
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
        sources {
          contents
          sourcePath
        }
      }
      sources {
        contents
        sourcePath
      }
    }
  }
}
`;

export class ArtifactsLoader {
  private db: TruffleDB;
  private config: object;

  constructor (db: TruffleDB, config: object) {
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

    if(this.config["contracts_build_directory"]) {
      await this.loadCompilations(this.config);
    }
    await this.loadBytecodes(contractNames);
    await this.loadSources(contractNames);

  }

  async loadBytecodes(contractNames: string[]) {
    const createBytecodes = await Promise.all(contractNames.map(
      async (name) =>
        (await this.db.query(GetBytecode, { name }))
          .data
          .artifacts
          .contract
          .constructor
          .createBytecode
    ));

    const bytecodes = [...createBytecodes];

    await this.db.query(AddBytecodes, { bytecodes });
  }

  async loadSources(contractNames: string[]) {
    const contractSources = await Promise.all(contractNames.map(
      async (name) =>
        (await this.db.query(GetSource, { name }))
          .data
          .artifacts
          .contract
          .sourceContract
          .source
    ));

    const sources = [...contractSources];

    await this.db.query(AddSources, { sources });
  }
  
  async loadCompilations(compilationConfig) {
    let compilationsArray = [];
    let sources = [];
     await Contracts.compile(compilationConfig, async (err, output) => {
      if(err) console.error(err);
      else {
        const compilationsData = Object.values(output.contracts);
        for(let contract in compilationsData) {
          let sourceObject = {
            contents: compilationsData[contract]["source"], 
            sourcePath: compilationsData[contract]["sourcePath"]
          };

          let sourceId = generateId({
            contents: compilationsData[contract]["source"], 
            sourcePath: compilationsData[contract]["sourcePath"]
          });
          
          sources.push({contents: compilationsData[contract]["source"], sourcePath: compilationsData[contract]["sourcePath"]});

          let compilationObject = {
            compiler: {
              name: compilationsData[contract]["compiler"]["name"],
              version: compilationsData[contract]["compiler"]["version"]
            },
            contracts: [
              {
                name: compilationsData[contract]["contract_name"],
                source: {
                  id: sourceId
                },
                ast: {
                  json: JSON.stringify(compilationsData[contract]["ast"]),
                }
              }
            ],
            sources: [
              { id: sourceId }
            ]
          }

          compilationsArray.push(compilationObject);

        }

        await this.db.query(AddSources, { sources }).then(async () =>  await this.db.query(AddCompilations, { compilations: compilationsArray }));
      }  
      
    });
  }

}
