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
  idFields: ["bytes", "linkReferences"],
  typeDefs: gql`
    type Bytecode implements Resource {
      bytes: Bytes!
      linkReferences: [LinkReference]
      instructions(count: Int): [Instruction!]
    }

    scalar Bytes

    type LinkReference {
      offsets: [ByteOffset!]!
      name: String
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
      }
    }
  }
};
