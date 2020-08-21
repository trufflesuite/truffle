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
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const source_graphql_1 = require("./source.graphql");
describe("Source", () => {
    let wsClient, addSourceResult;
    const expectedId = utils_1.generateId({
        contents: utils_1.Migrations.source,
        sourcePath: utils_1.Migrations.sourcePath
    });
    const variables = {
        contents: utils_1.Migrations.source,
        sourcePath: utils_1.Migrations.sourcePath
    };
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        wsClient = new utils_1.WorkspaceClient();
        addSourceResult = yield wsClient.execute(source_graphql_1.AddSource, variables);
    }));
    test("can be added", () => __awaiter(void 0, void 0, void 0, function* () {
        expect(addSourceResult).toHaveProperty("sourcesAdd");
        const { sourcesAdd } = addSourceResult;
        expect(sourcesAdd).toHaveProperty("sources");
        const { sources } = sourcesAdd;
        expect(sources).toHaveLength(1);
        const source = sources[0];
        expect(source).toHaveProperty("id");
        const { id } = source;
        expect(id).toEqual(expectedId);
    }));
    test("can be queried", () => __awaiter(void 0, void 0, void 0, function* () {
        const getSourceResult = yield wsClient.execute(source_graphql_1.GetSource, {
            id: expectedId
        });
        expect(getSourceResult).toHaveProperty("source");
        const { source } = getSourceResult;
        expect(source).toHaveProperty("id");
        expect(source).toHaveProperty("contents");
        expect(source).toHaveProperty("sourcePath");
        const { id, contents, sourcePath } = source;
        expect(id).toEqual(expectedId);
        expect(contents).toEqual(variables.contents);
        expect(sourcePath).toEqual(variables.sourcePath);
    }));
    test("can retrieve all sources", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllSourcesResult = yield wsClient.execute(source_graphql_1.GetAllSources, {});
        expect(getAllSourcesResult).toHaveProperty("sources");
        const { sources } = getAllSourcesResult;
        expect(sources).toHaveProperty("length");
        const firstSource = sources[0];
        expect(firstSource).toHaveProperty("id");
        expect(firstSource).toHaveProperty("ast");
        expect(firstSource).toHaveProperty("contents");
        expect(firstSource).toHaveProperty("sourcePath");
    }));
});
//# sourceMappingURL=source.spec.js.map