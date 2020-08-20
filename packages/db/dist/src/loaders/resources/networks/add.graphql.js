"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddNetworks = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AddNetworks = graphql_tag_1.default`
  input HistoricBlockInput {
    height: Int!
    hash: String!
  }

  input NetworkInput {
    name: String
    networkId: NetworkId!
    historicBlock: HistoricBlockInput!
  }

  mutation AddNetworks($networks: [NetworkInput!]!) {
    workspace {
      networksAdd(input: { networks: $networks }) {
        networks {
          id
          networkId
          historicBlock {
            height
            hash
          }
        }
      }
    }
  }
`;
//# sourceMappingURL=add.graphql.js.map
