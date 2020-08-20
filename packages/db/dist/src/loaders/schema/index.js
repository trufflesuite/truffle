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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loaderSchema = exports.ArtifactsLoader = void 0;
const artifactsLoader_1 = require("./artifactsLoader");
Object.defineProperty(exports, "ArtifactsLoader", {
  enumerable: true,
  get: function () {
    return artifactsLoader_1.ArtifactsLoader;
  }
});
const tmp = require("tmp");
const graphql_tools_1 = require("@gnd/graphql-tools");
const apollo_server_1 = require("apollo-server");
const typeDefs = apollo_server_1.gql`
  type ArtifactsLoadPayload {
    success: Boolean
  }
  type Mutation {
    artifactsLoad: ArtifactsLoadPayload
  }
  type Query {
    dummy: String
  }
`;
const resolvers = {
  Mutation: {
    artifactsLoad: {
      resolve: (
        _,
        args,
        { artifactsDirectory, contractsDirectory, workingDirectory, db },
        info
      ) =>
        __awaiter(void 0, void 0, void 0, function* () {
          const tempDir = tmp.dirSync({ unsafeCleanup: true });
          tmp.setGracefulCleanup();
          const compilationConfig = {
            contracts_directory: contractsDirectory,
            contracts_build_directory: tempDir.name,
            artifacts_directory: artifactsDirectory,
            working_directory: workingDirectory,
            all: true
          };
          const loader = new artifactsLoader_1.ArtifactsLoader(
            db,
            compilationConfig
          );
          yield loader.load();
          tempDir.removeCallback();
          return true;
        })
    }
  },
  ArtifactsLoadPayload: {
    success: {
      resolve: () => true
    }
  }
};
exports.loaderSchema = graphql_tools_1.makeExecutableSchema({
  typeDefs,
  resolvers
});
//# sourceMappingURL=index.js.map
