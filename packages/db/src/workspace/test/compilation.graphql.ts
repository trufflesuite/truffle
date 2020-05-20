import gql from "graphql-tag";

export const AddCompilation = gql`
  mutation AddCompilation(
    $compilerName: String!
    $compilerVersion: String!
    $sourceId: ID!
    $abi: String!
    $sourceMap: String!
  ) {
    compilationsAdd(
      input: {
        compilations: [
          {
            compiler: { name: $compilerName, version: $compilerVersion }
            sourceMaps: [{ json: $sourceMap }]
            processedSources: [
              {
                name: "testing"
                ast: { json: $abi }
                source: { id: $sourceId }
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
          json
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
      }
    }
  }
`;

export const GetCompilationWithContracts = gql`
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
        contracts {
          id
        }
        source {
          contents
        }
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
