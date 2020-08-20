"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function () {
            return m[k];
          }
        });
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
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
exports.Migrations = exports.WorkspaceClient = exports.fixturesDirectory = void 0;
const path_1 = __importDefault(require("path"));
const graphql = __importStar(require("graphql"));
const workspace_1 = require("@truffle/db/workspace");
var helpers_1 = require("@truffle/db/helpers");
Object.defineProperty(exports, "generateId", {
  enumerable: true,
  get: function () {
    return helpers_1.generateId;
  }
});
const tmp_1 = __importDefault(require("tmp"));
exports.fixturesDirectory = path_1.default.join(
  __dirname, // db/src/db/test
  "..", // db/src/db
  "..", // db/src/
  "..", // db/
  "test",
  "fixtures"
);
const tempDir = tmp_1.default.dirSync({ unsafeCleanup: true });
tmp_1.default.setGracefulCleanup();
class WorkspaceClient {
  constructor() {
    this.workspace = new workspace_1.Workspace({
      workingDirectory: tempDir.name
    });
  }
  execute(request, variables = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      const result = yield graphql.execute(
        workspace_1.schema,
        request,
        null, // root object, managed by workspace
        { workspace: this.workspace }, // context vars
        variables
      );
      return result.data;
    });
  }
}
exports.WorkspaceClient = WorkspaceClient;
exports.Migrations = require(path_1.default.join(
  exports.fixturesDirectory,
  "Migrations.json"
));
//# sourceMappingURL=utils.js.map
