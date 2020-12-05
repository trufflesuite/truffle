import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:contractInstances");

import gql from "graphql-tag";

import { Definition } from "./types";

export const contractInstances: Definition<"contractInstances"> = {
  names: {
    resource: "contractInstance",
    Resource: "ContractInstance",
    resources: "contractInstances",
    Resources: "ContractInstances",
    resourcesMutate: "contractInstancesAdd",
    ResourcesMutate: "ContractInstancesAdd"
  },
  createIndexes: [],
  idFields: ["address", "network"],
  typeDefs: gql`
    type ContractInstance implements Resource {
      address: Address!
      network: Network!
      creation: ContractInstanceCreation
      callBytecode: LinkedBytecode!
      contract: Contract
    }

    scalar Address

    type ContractInstanceCreation {
      transactionHash: TransactionHash
      constructorArguments: [ConstructorArgument]
      constructor: Constructor
    }

    scalar TransactionHash

    scalar ConstructorArgument

    type Constructor {
      createBytecode: LinkedBytecode
    }

    type LinkedBytecode {
      bytecode: Bytecode!
      linkValues: [LinkValue]!
    }

    type LinkValue {
      linkReference: LinkReference!
      value: Bytes
    }

    input ContractInstanceInput {
      address: Address!
      network: ResourceReferenceInput
      creation: ContractInstanceCreationInput
      contract: ResourceReferenceInput
      callBytecode: LinkedBytecodeInput
    }

    input ContractInstanceCreationInput {
      transactionHash: TransactionHash!
      constructor: ConstructorInput!
    }

    input ConstructorInput {
      createBytecode: LinkedBytecodeInput!
    }

    input LinkedBytecodeInput {
      bytecode: ResourceReferenceInput
      linkValues: [LinkValueInput]
    }

    input LinkValueInput {
      value: Address!
      linkReference: LinkValueLinkReferenceInput!
    }

    input LinkValueLinkReferenceInput {
      bytecode: ResourceReferenceInput!
      index: Int
    }
  `,
  resolvers: {
    ContractInstance: {
      network: {
        resolve: async ({ network: { id } }, _, { workspace }) => {
          debug("Resolving ContractInstance.network...");

          const result = await workspace.get("networks", id);

          debug("Resolved ContractInstance.network.");
          return result;
        }
      },
      contract: {
        resolve: async ({ contract: { id } }, _, { workspace }) => {
          debug("Resolving ContractInstance.contract...");
          const result = await workspace.get("contracts", id);

          debug("Resolved ContractInstance.contract.");
          return result;
        }
      },
      callBytecode: {
        resolve: async ({ callBytecode }, _, { workspace }) => {
          debug("Resolving ContractInstance.callBytecode...");

          const bytecode = await workspace.get(
            "bytecodes",
            callBytecode.bytecode.id
          );
          const linkValues = callBytecode.linkValues.map(
            ({ value, linkReference }) => {
              return {
                value: value,
                linkReference: bytecode.linkReferences[linkReference.index]
              };
            }
          );

          debug("Resolved ContractInstance.callBytecode.");
          return {
            bytecode: bytecode,
            linkValues: linkValues
          };
        }
      },
      creation: {
        resolve: async (input, _, { workspace }) => {
          debug("Resolving ContractInstance.creation...");

          let bytecode = await workspace.get(
            "bytecodes",
            input.creation.constructor.createBytecode.bytecode.id
          );
          let transactionHash = input.creation.transactionHash;
          let linkValues = input.creation.constructor.createBytecode.linkValues.map(
            ({ value, linkReference }) => {
              return {
                value: value,
                linkReference: bytecode.linkReferences[linkReference.index]
              };
            }
          );

          debug("Resolved ContractInstance.creation.");
          return {
            transactionHash: transactionHash,
            constructor: {
              createBytecode: {
                bytecode: bytecode,
                linkValues: linkValues
              }
            }
          };
        }
      }
    }
  }
};
