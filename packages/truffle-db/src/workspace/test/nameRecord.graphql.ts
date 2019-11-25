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
    type: String!
  }

  input PreviousNameRecordInput {
    id: ID!
  }

  input NameRecordInput {
    name: String!
    resource: ResourceInput!
    previous: PreviousNameRecordInput
  }

  mutation AddNameRecords(
    $name: String!
    $resource: ResourceInput!
    $previous: PreviousNameRecordInput
  ) {
    nameRecordsAdd(
      input: {
        nameRecords: [{ name: $name, resource: $resource, previous: $previous }]
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
