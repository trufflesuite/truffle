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
