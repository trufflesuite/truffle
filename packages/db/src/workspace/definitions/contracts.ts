import gql from "graphql-tag";

import { Definition } from "./types";

export const contracts: Definition<"contracts"> = {
  createIndexes: [
    {
      fields: ["compilation.id", "processedSource.index"]
    }
  ],
  idFields: ["name", "abi", "processedSource", "compilation"],
  typeDefs: gql`
    type Contract implements Resource & Named {
      id: ID!
      name: String!
      source: Source
      abi: ABI
      compilation: Compilation
      processedSource: ProcessedSource
      createBytecode: Bytecode
      callBytecode: Bytecode
    }

    type ABI {
      json: String!
    }

    input ContractInput {
      name: String!
      abi: ABIInput
      compilation: ResourceReferenceInput
      processedSource: IndexReferenceInput
      createBytecode: ResourceReferenceInput
      callBytecode: ResourceReferenceInput
    }

    input IndexReferenceInput {
      index: Int!
    }

    input ABIInput {
      json: String!
    }
  `,
  resolvers: {
    Contract: {
      compilation: {
        resolve: async ({ compilation }, _, { workspace }) => {
          return await workspace.compilation(compilation);
        }
      },
      processedSource: {
        fragment: `... on Contract { compilation { id } }`,
        resolve: async ({ processedSource, compilation }, _, { workspace }) => {
          const { processedSources } = await workspace.compilation(compilation);

          return processedSources[processedSource.index];
        }
      },
      createBytecode: {
        resolve: ({ createBytecode: { id } }, _, { workspace }) =>
          workspace.databases.get("bytecodes", id)
      },
      callBytecode: {
        resolve: ({ callBytecode }, _, { workspace }) =>
          workspace.bytecode(callBytecode)
      }
    }
  }
};
