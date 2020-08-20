"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddNetworks = exports.GetAllNetworks = exports.GetNetwork = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.GetNetwork = graphql_tag_1.default`
  query GetNetwork($id: ID!) {
    network(id: $id) {
      networkId
      id
    }
  }
`;
exports.GetAllNetworks = graphql_tag_1.default`
  query getAllNetworks {
    networks {
      id
      networkId
    }
  }
`;
exports.AddNetworks = graphql_tag_1.default`
  mutation AddNetworks(
    $networkId: NetworkId!
    $height: Int!
    $hash: String!
    $name: String!
  ) {
    networksAdd(
      input: {
        networks: [
          {
            name: $name
            networkId: $networkId
            historicBlock: { height: $height, hash: $hash }
          }
        ]
      }
    ) {
      networks {
        networkId
        id
      }
    }
  }
`;
//# sourceMappingURL=network.graphql.js.map
