import gql from "graphql-tag";

export const AddNameRecords = gql`
  input ResourceInput {
    id: ID!
    type: String!
  }

  input PreviousNameRecordInput {
    id: ID!
  }

  input NameRecordAddInput {
    name: String!
    resource: ResourceInput!
    previous: PreviousNameRecordInput
  }

  mutation AddNameRecords($nameRecords: [NameRecordAddInput!]!) {
    workspace {
      nameRecordsAdd(input: { nameRecords: $nameRecords }) {
        nameRecords {
          id
          resource {
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
          previous {
            name
          }
        }
      }
    }
  }
`;
