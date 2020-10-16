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

  input CompilationProcessedSourceSourceInput {
    id: ID!
  }

  input CompilationProcessedSourceAstInput {
    json: String!
  }

  input CompilationSourceMapInput {
    json: String!
  }

  input CompilationProcessedSourceInput {
    name: String
    source: CompilationProcessedSourceSourceInput
    ast: CompilationProcessedSourceAstInput
  }

  input CompilationInput {
    compiler: CompilerInput!
    sources: [CompilationSourceInput!]!
    processedSources: [CompilationProcessedSourceInput!]
    sourceMaps: [CompilationSourceMapInput]
  }
  input CompilationsAddInput {
    compilations: [CompilationInput!]!
  }

  mutation AddCompilations($compilations: [CompilationInput!]!) {
    compilationsAdd(input: { compilations: $compilations }) {
      compilations {
        id
      }
    }
  }
`;
