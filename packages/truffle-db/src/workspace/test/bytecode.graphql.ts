import gql from "graphql-tag";

export const GetBytecode = gql`
  query GetBytecode($id: ID!) {
    bytecode(id: $id) {
      id
      bytes
    }
  }
`;

export const GetAllBytecodes = gql`
  query GetAllBytecodes {
    bytecodes {
      id
      bytes
      linkReferences {
        id
        offsets
        length
      }
      sourceMap
      instructions {
        opcode
      }
    }

  }
`;

export const AddBytecode = gql`
  mutation AddBytecode($bytes: Bytes!) {
    bytecodesAdd(input: {
      bytecodes: [{
        bytes: $bytes
      }]
    }) {
      bytecodes {
        id
      }
    }
  }
`;
