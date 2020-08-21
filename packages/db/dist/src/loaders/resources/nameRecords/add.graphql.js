"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddNameRecords = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AddNameRecords = graphql_tag_1.default `
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
//# sourceMappingURL=add.graphql.js.map