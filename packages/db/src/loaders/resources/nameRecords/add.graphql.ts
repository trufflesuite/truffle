import gql from "graphql-tag";

export const AddNameRecords = gql`
  mutation AddNameRecords($nameRecords: [NameRecordInput!]!) {
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
`;
