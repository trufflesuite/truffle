import gql from "graphql-tag";

export const GetNameRecord = gql`
  query GetNameRecord($id: ID!) {
    nameRecord(id: $id) {
      id
      resource {
        id
        name
        ... on Network {
          networkId
        }
      }
    }
  }
`;

export const GetAllNameRecords = gql`
  query GetAllNameRecords {
    nameRecords {
      id
      resource {
        id
        name
        ... on Network {
          networkId
        }
      }
    }
  }
`;

export const AddNameRecord = gql`
  mutation AddNameRecord(
    $resource: TypedResourceReferenceInput!
    $previous: ResourceReferenceInput
  ) {
    nameRecordsAdd(
      input: { nameRecords: [{ resource: $resource, previous: $previous }] }
    ) {
      nameRecords {
        id
        resource {
          id
          name
          ... on Network {
            networkId
          }
          ... on Contract {
            abi {
              json
            }
          }
        }
      }
    }
  }
`;
