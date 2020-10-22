import gql from "graphql-tag";

import { Definition } from "./types";

export const contractInstances: Definition<"contractInstances"> = {
  createIndexes: [],
  idFields: ["address", "network"],
  typeDefs: gql`
    type ContractInstance implements Resource {
      id: ID!
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
        resolve: ({ network: { id } }, _, { workspace }) =>
          workspace.get("networks", id)
      },
      contract: {
        resolve: ({ contract: { id } }, _, { workspace }) =>
          workspace.get("contracts", id)
      },
      callBytecode: {
        resolve: async ({ callBytecode }, _, { workspace }) => {
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
          return {
            bytecode: bytecode,
            linkValues: linkValues
          };
        }
      },
      creation: {
        resolve: async (input, _, { workspace }) => {
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
