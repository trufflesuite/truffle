"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const fs_1 = __importDefault(require("fs"));
const shims_1 = require("@truffle/workflow-compile/shims");
const TruffleResolver = require("@truffle/resolver");
exports.resolvers = {
  Query: {
    contract: {
      resolve(_, { name, networkId }, context) {
        const truffleResolver = new TruffleResolver({
          contracts_build_directory: context.artifactsDirectory,
          working_directory: context.workingDirectory || process.cwd()
        });
        const artifact = truffleResolver.require(name)._json;
        const linkedBytecodeCreate = shims_1.shimBytecode(artifact.bytecode);
        const linkedBytecodeCall = shims_1.shimBytecode(
          artifact.deployedBytecode
        );
        const result = Object.assign(Object.assign({}, artifact), {
          abi: {
            json: JSON.stringify(artifact.abi)
          },
          ast: {
            json: JSON.stringify(artifact.ast)
          },
          source: {
            contents: artifact.source,
            sourcePath: artifact.sourcePath
          },
          bytecode: {
            bytes: linkedBytecodeCreate.bytes,
            linkReferences: linkedBytecodeCreate.linkReferences
          },
          deployedBytecode: {
            bytes: linkedBytecodeCall.bytes,
            linkReferences: linkedBytecodeCall.linkReferences
          },
          sourceMap: {
            json: JSON.stringify(artifact.sourceMap)
          }
        });
        if (networkId) {
          return result.networks[networkId]
            ? Object.assign(Object.assign({}, result), {
                networks: {
                  [networkId]: result.networks[networkId]
                }
              })
            : null;
        }
        return result;
      }
    },
    contractNames: {
      resolve(_, {}, context) {
        const contents = fs_1.default.readdirSync(context.artifactsDirectory);
        return contents
          .filter(filename => filename.endsWith(".json"))
          .map(filename => filename.slice(0, -5));
      }
    }
  },
  ContractObject: {
    networks: {
      resolve({ networks }) {
        return Object.entries(networks).map(([networkId, networkObject]) => ({
          networkId,
          networkObject
        }));
      }
    }
  }
};
//# sourceMappingURL=resolvers.js.map
