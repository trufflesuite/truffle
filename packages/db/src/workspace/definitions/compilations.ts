import gql from "graphql-tag";

import { Definition } from "./types";

export const compilations: Definition<"compilations"> = {
  createIndexes: [],
  idFields: ["compiler", "sources"],
  typeDefs: gql`
    type Compilation implements Resource {
      id: ID!
      compiler: Compiler!
      sources: [Source]!
      processedSources: [ProcessedSource]!
      sourceMaps: [SourceMap]
    }

    type Compiler {
      name: String!
      version: String!
      settings: CompilerSettings
    }

    scalar CompilerSettings

    type ProcessedSource {
      source: Source!
      contracts: [Contract]!
      ast: AST
    }

    type AST {
      json: String!
    }

    type SourceMap {
      json: String!
    }

    input CompilationInput {
      compiler: CompilerInput!
      processedSources: [ProcessedSourceInput!]
      sources: [ResourceReferenceInput!]!
      sourceMaps: [SourceMapInput]
    }

    input CompilerInput {
      name: String!
      version: String!
      settings: CompilerSettings
    }

    input ProcessedSourceInput {
      name: String
      source: ResourceReferenceInput
      ast: ASTInput
    }

    input ASTInput {
      json: String!
    }

    input SourceMapInput {
      json: String!
    }
  `
};
