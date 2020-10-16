import gql from "graphql-tag";

import { Definition } from "./types";

export const bytecodes: Definition<"bytecodes"> = {
  createIndexes: [],
  idFields: ["bytes", "linkReferences"],
  typeDefs: gql`
    type Bytecode implements Resource {
      id: ID!
      bytes: Bytes!
      linkReferences: [LinkReference]
      instructions: [Instruction!]
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
      meta: InstructionMeta
      sourceRange: SourceRange
      pushData: Bytes
    }

    type InstructionMeta {
      cost: Int!
      dynamic: Boolean

      # stack operations
      pops: Int
      pushes: Int
    }

    type SourceRange {
      source: Source!
      start: ByteOffset!
      length: Int!
      meta: SourceRangeMeta!
    }

    type SourceRangeMeta {
      jump: JumpDirection
    }

    enum JumpDirection {
      IN
      OUT
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
  `
};
