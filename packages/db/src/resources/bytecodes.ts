import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:bytecodes");

import gql from "graphql-tag";
import CodeUtils from "@truffle/code-utils";

import { Definition } from "./types";

export const bytecodes: Definition<"bytecodes"> = {
  names: {
    resource: "bytecode",
    Resource: "Bytecode",
    resources: "bytecodes",
    Resources: "Bytecodes",
    resourcesMutate: "bytecodesAdd",
    ResourcesMutate: "BytecodesAdd"
  },
  createIndexes: [],
  idFields: ["bytes", "linkReferences", "immutableReferences"],
  typeDefs: gql`
    type Bytecode implements Resource {
      bytes: Bytes!
      linkReferences: [LinkReference]
      instructions(count: Int): [Instruction!]
      immutableReferences: [ImmutableReferences]
    }

    scalar Bytes

    type LinkReference {
      offsets: [ByteOffset!]!
      name: String
      length: Int!
    }

    type ImmutableReferences {
      ASTId: String!
      references: [ImmutableReference]
    }

    type ImmutableReference {
      start: Int!
      length: Int!
    }

    scalar ByteOffset

    type Instruction {
      opcode: String!
      programCounter: Int!
      pushData: Bytes
    }

    input BytecodeInput {
      bytes: Bytes!
      linkReferences: [LinkReferenceInput]
      immutableReferences: [ImmutableReferencesInput]
    }

    input ImmutableReferencesInput {
      ASTId: String!
      references: [ImmutableReferenceInput]
    }

    input ImmutableReferenceInput {
      length: Int!
      start: Int!
    }

    input LinkReferenceInput {
      offsets: [Int!]!
      name: String
      length: Int!
    }
  `,
  resolvers: {
    Bytecode: {
      instructions: {
        async resolve({ bytes }, { count = null }) {
          const parsed = CodeUtils.parseCode(`0x${bytes}`, count);

          return parsed.map(
            ({ name: opcode, pc: programCounter, pushData }) => ({
              opcode,
              programCounter,
              pushData
            })
          );
        }
      },
      immutableReferences: {
        async resolve({ immutableReferences }, {}, {}) {
          let referencesArray = [];

          if (
            immutableReferences &&
            Object.keys(immutableReferences).length > 0
          ) {
            Object.entries(immutableReferences).map(immutableReference => {
              referencesArray.push({
                ASTId: immutableReference[1]["ASTId"],
                references: immutableReference[1]["references"]
              });
            });
          }
          return referencesArray;
        }
      }
    }
  }
};
