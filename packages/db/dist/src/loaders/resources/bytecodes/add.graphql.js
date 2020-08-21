"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBytecodes = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AddBytecodes = graphql_tag_1.default `
  input LinkReferenceInput {
    offsets: [Int]
    name: String
    length: Int
  }

  input BytecodeInput {
    bytes: Bytes!
    linkReferences: [LinkReferenceInput]!
  }

  mutation AddBytecodes($bytecodes: [BytecodeInput!]!) {
    workspace {
      bytecodesAdd(input: { bytecodes: $bytecodes }) {
        bytecodes {
          id
          linkReferences {
            offsets
            name
            length
          }
        }
      }
    }
  }
`;
//# sourceMappingURL=add.graphql.js.map