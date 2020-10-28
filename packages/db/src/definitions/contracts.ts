import { logger } from "@truffle/db/logger";
const debug = logger("db:definitions:contracts");

import gql from "graphql-tag";

import { Definition } from "./types";

export const contracts: Definition<"contracts"> = {
  createIndexes: [
    {
      fields: ["compilation.id"]
    },
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
        resolve: async ({ compilation: { id } }, _, { workspace }) => {
          debug("Resolving Contract.compilation...");

          const result = workspace.get("compilations", id);

          debug("Resolved Contract.compilation.");
          return result;
        }
      },
      processedSource: {
        fragment: `... on Contract { compilation { id } }`,
        resolve: async (
          { processedSource, compilation: { id } },
          _,
          { workspace }
        ) => {
          debug("Resolving Contract.processedSource...");

          const { processedSources } = await workspace.get("compilations", id);

          debug("Resolved Contract.processedSource.");
          return processedSources[processedSource.index];
        }
      },
      createBytecode: {
        resolve: async ({ createBytecode: { id } }, _, { workspace }) => {
          debug("Resolving Contract.createBytecode...");

          const result = await workspace.get("bytecodes", id);

          debug("Resolved Contract.createBytecode.");
          return result;
        }
      },
      callBytecode: {
        resolve: async ({ callBytecode: { id } }, _, { workspace }) => {
          debug("Resolving Contract.callBytecode...");

          const result = await workspace.get("bytecodes", id);

          debug("Resolved Contract.callBytecode.");
          return result;
        }
      }
    }
  }
};
