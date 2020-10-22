import gql from "graphql-tag";

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

export const GetBytecode = gql`
  query GetBytecode($id: ID!) {
    bytecode(id: $id) {
      id
      bytes
      linkReferences {
        offsets
        name
        length
      }
    }
  }
`;

export const AddBytecode = gql`
  mutation AddBytecode($bytes: Bytes!, $linkReferences: [LinkReferenceInput]) {
    bytecodesAdd(
      input: { bytecodes: [{ bytes: $bytes, linkReferences: $linkReferences }] }
    ) {
      bytecodes {
        id
        bytes
        linkReferences {
          offsets
          name
          length
        }
      }
    }
  }
`;
