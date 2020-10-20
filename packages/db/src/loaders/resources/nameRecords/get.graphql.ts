import gql from "graphql-tag";
import camelCase from "camel-case";

export const forType = (type: string) => gql`
  query GetResourceName($id: ID!) {
    ${camelCase(type)}(id: $id) {
      id
      name
    }
  }
`;
