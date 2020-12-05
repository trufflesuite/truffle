import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:contracts");

import gql from "graphql-tag";
import { pascalCase } from "change-case";
import { normalize } from "@truffle/abi-utils";

import { Definition } from "./types";

export const contracts: Definition<"contracts"> = {
  names: {
    resource: "contract",
    Resource: "Contract",
    resources: "contracts",
    Resources: "Contracts",
    resourcesMutate: "contractsAdd",
    ResourcesMutate: "ContractsAdd"
  },
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
      name: String!
      abi: ABI
      compilation: Compilation
      processedSource: ProcessedSource
      createBytecode: Bytecode
      callBytecode: Bytecode
    }

    type ABI {
      json: String!
      entries: [Entry]
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

    interface Entry {
      type: String!
    }

    enum StateMutability {
      pure
      view
      nonpayable
      payable
    }

    type FunctionEntry implements Entry {
      type: String!
      name: String!
      inputs: [Parameter]!
      outputs: [Parameter]!
      stateMutability: StateMutability!
    }

    type ConstructorEntry implements Entry {
      type: String!
      inputs: [Parameter]!
      stateMutability: StateMutability!
    }

    type FallbackEntry implements Entry {
      type: String!
      stateMutability: StateMutability!
    }

    type ReceiveEntry implements Entry {
      type: String!
      stateMutability: StateMutability!
    }

    type EventEntry implements Entry {
      type: String!
      name: String!
      inputs: [EventParameter]!
      anonymous: Boolean!
    }

    type Parameter {
      name: String!
      type: String!
      components: [Parameter]
      internalType: String
    }

    type EventParameter {
      name: String!
      type: String!
      components: [Parameter]
      internalType: String
      indexed: Boolean!
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
        resolve: async ({ createBytecode }, _, { workspace }) => {
          debug("Resolving Contract.createBytecode...");

          if (!createBytecode) {
            return;
          }

          const { id } = createBytecode;

          const result = await workspace.get("bytecodes", id);

          debug("Resolved Contract.createBytecode.");
          return result;
        }
      },
      callBytecode: {
        resolve: async ({ callBytecode }, _, { workspace }) => {
          debug("Resolving Contract.callBytecode...");

          if (!callBytecode) {
            return;
          }

          const { id } = callBytecode;

          const result = await workspace.get("bytecodes", id);

          debug("Resolved Contract.callBytecode.");
          return result;
        }
      }
    },
    ABI: {
      entries: {
        resolve({ json }) {
          return normalize(JSON.parse(json));
        }
      }
    },
    Entry: {
      __resolveType(obj) {
        return `${pascalCase(obj.type)}Entry`;
      }
    }
  }
};
