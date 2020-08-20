"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetContractNames = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const utils_1 = require("./utils");
describe("ContractNames", () => {
  test("can be queried", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const wsClient = new utils_1.WorkspaceClient();
      const result = yield wsClient.execute(exports.GetContractNames, {});
      expect(result).toHaveProperty("contractNames");
      const { contractNames } = result;
      expect(contractNames).toEqual([]);
    }));
});
exports.GetContractNames = graphql_tag_1.default`
  query GetContractNames {
    contractNames
  }
`;
//# sourceMappingURL=contractNames.spec.js.map
