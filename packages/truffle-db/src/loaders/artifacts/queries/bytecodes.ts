import gql from "graphql-tag";

export const AddBytecodes = gql`
  input BytecodeInput {
    bytes: Bytes!
  }

  mutation AddBytecodes($bytecodes: [BytecodeInput!]!) {
    workspace {
      bytecodesAdd(input: { bytecodes: $bytecodes }) {
        bytecodes {
          id
        }
      }
    }
  }
`;
