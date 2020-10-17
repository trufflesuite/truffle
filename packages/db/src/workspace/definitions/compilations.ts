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
  `,
  resolvers: {
    Compilation: {
      sources: {
        resolve: ({ sources }, _, { workspace }) =>
          Promise.all(sources.map(({ id }) => workspace.get("sources", id)))
      },
      processedSources: {
        resolve: ({ id, processedSources }, _, {}) =>
          processedSources.map((processedSource, index) => ({
            ...processedSource,
            compilation: { id },
            index
          }))
      }
    },

    ProcessedSource: {
      source: {
        resolve: ({ source: { id } }, _, { workspace }) =>
          workspace.get("sources", id)
      },
      contracts: {
        resolve: ({ compilation, index }, _, { workspace }) =>
          workspace.find("contracts", {
            selector: {
              "compilation.id": compilation.id,
              "processedSource.index": index
            }
          })
      }
    }
  }
};
