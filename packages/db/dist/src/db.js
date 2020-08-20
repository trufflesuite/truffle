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
exports.TruffleDB = void 0;
const graphql_1 = require("graphql");
const data_1 = require("@truffle/db/data");
const commands_1 = require("@truffle/db/loaders/commands");
const workspace_1 = require("@truffle/db/workspace");
class TruffleDB {
  constructor(config) {
    this.context = this.createContext(config);
    this.schema = data_1.schema;
  }
  query(query, variables = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      const document =
        typeof query !== "string" ? query : graphql_1.parse(query);
      return yield graphql_1.execute(
        this.schema,
        document,
        null,
        this.context,
        variables
      );
    });
  }
  loadCompilations(result) {
    return __awaiter(this, void 0, void 0, function* () {
      const saga = commands_1.generateCompileLoad(result, {
        directory: this.context.workingDirectory
      });
      let cur = saga.next();
      while (!cur.done) {
        // HACK not sure why this is necessary; TS knows we're not done, so
        // cur.value should only be WorkspaceRequest (first Generator param),
        // not the return value (second Generator param)
        const { request, variables } = cur.value;
        const response = yield this.query(request, variables);
        cur = saga.next(response);
      }
      return cur.value;
    });
  }
  createContext(config) {
    return {
      workspace: new workspace_1.Workspace({
        workingDirectory: config.working_directory,
        adapter: (config.db || {}).adapter
      }),
      artifactsDirectory: config.contracts_build_directory,
      workingDirectory: config.working_directory || process.cwd(),
      contractsDirectory: config.contracts_directory,
      db: this
    };
  }
}
exports.TruffleDB = TruffleDB;
//# sourceMappingURL=db.js.map
