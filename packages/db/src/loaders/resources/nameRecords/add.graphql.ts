import gql from "graphql-tag";

export const AddNameRecords = gql`
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

  mutation AddNameRecords($nameRecords: [NameRecordInput!]!) {
    workspace {
      nameRecordsAdd(input: { nameRecords: $nameRecords }) {
        nameRecords {
          id
          name
          type
          resource {
            name
          }
          previous {
            id
            name
          }
        }
      }
    }
  }
`;
