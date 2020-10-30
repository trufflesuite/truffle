import gql from "graphql-tag";

export const AddBytecodes = gql`
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
