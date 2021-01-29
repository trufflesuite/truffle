import gql from "graphql-tag";

export const AddCompilation = gql`
  mutation AddCompilation(
    $compilerName: String!
    $compilerVersion: String!
    $sourceId: ID!
    $bytecodeId: ID!
    $abi: String!
    $sourceMap: String!
    $language: String!
    $astNode: String!
    $length: Int!
    $offset: Int!
    $contractBytecodeId: ID!
  ) {
    compilationsAdd(
      input: {
        compilations: [
          {
            compiler: { name: $compilerName, version: $compilerVersion }
            sourceMaps: [{ bytecode: { id: $bytecodeId }, data: $sourceMap }]
            processedSources: [
              {
                name: "testing"
                ast: { json: $abi }
                source: { id: $sourceId }
                language: $language
              }
            ]
            sources: [{ id: $sourceId }]
            immutableReferences: [
              {
                astNode: $astNode
                bytecode: { id: $contractBytecodeId }
                length: $length
                offsets: [$offset]
              }
            ]
          }
        ]
      }
    ) {
      compilations {
        id
        compiler {
          name
        }
        sources {
          contents
        }
        sourceMaps {
          data
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
        immutableReferences {
          astNode
          length
          offsets
        }
      }
    }
  }
`;

export const GetCompilation = gql`
  query GetCompilation($id: ID!) {
    compilation(id: $id) {
      id
      compiler {
        name
        version
      }
      sources {
        id
        contents
      }
      processedSources {
        source {
          contents
        }
        language
      }
      immutableReferences {
        astNode
        length
        offsets
      }
    }
  }
`;

export const GetCompilationContracts = gql`
  query GetCompilation($id: ID!) {
    compilation(id: $id) {
      contracts {
        id
        name
      }
    }
  }
`;
export const GetCompilationProcessedSources = gql`
  query GetCompilation($id: ID!) {
    compilation(id: $id) {
      processedSources {
        contracts {
          id
        }
        source {
          contents
        }
        language
      }
    }
  }
`;

export const GetAllCompilations = gql`
  query getAllCompilations {
    compilations {
      compiler {
        name
        version
        settings
      }

      sources {
        id
      }
    }
  }
`;
