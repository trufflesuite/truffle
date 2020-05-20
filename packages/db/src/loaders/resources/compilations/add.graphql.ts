import gql from "graphql-tag";

export const AddCompilations = gql`
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

  input CompilationSourceMapInput {
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
    sourceMaps: [CompilationSourceMapInput]
  }
  input CompilationsAddInput {
    compilations: [CompilationInput!]!
  }

  mutation AddCompilations($compilations: [CompilationInput!]!) {
    workspace {
      compilationsAdd(input: { compilations: $compilations }) {
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
          sourceMaps {
            json
          }
        }
      }
    }
  }
`;
