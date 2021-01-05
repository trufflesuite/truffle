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
      immutableReferences {
        ASTId
        references {
          start
          length
        }
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
      immutableReferences {
        ASTId
        references {
          start
          length
        }
      }
    }
  }
`;

export const AddBytecode = gql`
  mutation AddBytecode(
    $bytes: Bytes!
    $linkReferences: [LinkReferenceInput]
    $immutableReferences: [ImmutableReferencesInput]
  ) {
    bytecodesAdd(
      input: {
        bytecodes: [
          {
            bytes: $bytes
            linkReferences: $linkReferences
            immutableReferences: $immutableReferences
          }
        ]
      }
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
