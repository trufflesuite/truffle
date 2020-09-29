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
  input ResourceInput {
    id: ID!
  }

  input PreviousNameRecordInput {
    id: ID!
  }

  input NameRecordInput {
    name: String!
    type: String!
    resource: ResourceInput!
    previous: PreviousNameRecordInput
  }

  mutation AddNameRecord(
    $name: String!
    $type: String!
    $resource: ResourceInput!
    $previous: PreviousNameRecordInput
  ) {
    nameRecordsAdd(
      input: {
        nameRecords: [
          { name: $name, type: $type, resource: $resource, previous: $previous }
        ]
      }
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
