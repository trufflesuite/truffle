import gql from "graphql-tag";

export const AddBytecodes = gql`
  input LinkReferenceInput {
    offsets: [Int]
    name: String
    length: Int
  }

  input BytecodeInput {
    bytes: Bytes!
    linkReferences: [LinkReferenceInput]!
  }

  mutation AddBytecodes($bytecodes: [BytecodeInput!]!) {
    bytecodesAdd(input: { bytecodes: $bytecodes }) {
      bytecodes {
        id
        linkReferences {
          offsets
          name
          length
        }
      }
    }
  }
`;
