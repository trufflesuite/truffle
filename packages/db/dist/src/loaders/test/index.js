"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const db_1 = require("@truffle/db");
const tmp_1 = __importDefault(require("tmp"));
jest.mock("@truffle/workflow-compile/new", () => ({
    compile: function (config, callback) {
        return require(path_1.default.join(__dirname, "..", "schema", "test", "workflowCompileOutputMock", "compilationOutput.json"));
    }
}));
const fixturesDirectory = path_1.default.join(__dirname, "..", "schema", "test");
const tempDir = tmp_1.default.dirSync({ unsafeCleanup: true });
tmp_1.default.setGracefulCleanup();
// minimal config
const config = {
    contracts_build_directory: path_1.default.join(fixturesDirectory, "compilationSources", "build", "contracts"),
    contracts_directory: path_1.default.join(fixturesDirectory, "compilationSources"),
    artifacts_directory: path_1.default.join(fixturesDirectory, "compilationSources", "build", "contracts"),
    working_directory: tempDir.name,
    all: true
};
const db = new db_1.TruffleDB(config);
const Load = graphql_tag_1.default `
  mutation LoadArtifacts {
    loaders {
      artifactsLoad {
        success
      }
    }
  }
`;
afterAll(() => {
    tempDir.removeCallback();
});
it("loads artifacts and returns true ", () => __awaiter(void 0, void 0, void 0, function* () {
    const { data: { loaders: { artifactsLoad: { success } } } } = yield db.query(Load);
    expect(success).toEqual(true);
}));
//# sourceMappingURL=index.js.map