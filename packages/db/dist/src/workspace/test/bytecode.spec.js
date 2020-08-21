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
const bytecode_graphql_1 = require("./bytecode.graphql");
const shims_1 = require("@truffle/workflow-compile/shims");
describe("Bytecode", () => {
    let wsClient;
    let expectedId;
    let variables, addBytecodeResult, shimmedBytecode;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        wsClient = new utils_1.WorkspaceClient();
        shimmedBytecode = shims_1.shimBytecode(utils_1.Migrations.bytecode);
        expectedId = utils_1.generateId(shimmedBytecode);
        addBytecodeResult = yield wsClient.execute(bytecode_graphql_1.AddBytecode, shimmedBytecode);
    }));
    test("can be added", () => __awaiter(void 0, void 0, void 0, function* () {
        expect(addBytecodeResult).toHaveProperty("bytecodesAdd");
        const { bytecodesAdd } = addBytecodeResult;
        expect(bytecodesAdd).toHaveProperty("bytecodes");
        const { bytecodes } = bytecodesAdd;
        expect(bytecodes).toHaveLength(1);
        const bytecode = bytecodes[0];
        expect(bytecode).toHaveProperty("id");
        const { id } = bytecode;
        expect(id).toEqual(expectedId);
    }));
    test("can be queried", () => __awaiter(void 0, void 0, void 0, function* () {
        const executionResult = yield wsClient.execute(bytecode_graphql_1.GetBytecode, {
            id: expectedId
        });
        expect(executionResult).toHaveProperty("bytecode");
        const { bytecode } = executionResult;
        expect(bytecode).toHaveProperty("id");
        expect(bytecode).toHaveProperty("bytes");
        const { id, bytes, linkReferences } = bytecode;
        expect(id).toEqual(expectedId);
        expect(bytes).toEqual(shimmedBytecode.bytes);
        expect(linkReferences).toEqual(shimmedBytecode.linkReferences);
    }));
    test("can retrieve all bytecodes", () => __awaiter(void 0, void 0, void 0, function* () {
        const executionResult = yield wsClient.execute(bytecode_graphql_1.GetAllBytecodes, {});
        expect(executionResult).toHaveProperty("bytecodes");
        const { bytecodes } = executionResult;
        expect(bytecodes).toHaveProperty("length");
        bytecodes.forEach(bc => {
            expect(bc).toHaveProperty("id");
            expect(bc).toHaveProperty("bytes");
            expect(bc).toHaveProperty("linkReferences");
            expect(bc).toHaveProperty("instructions");
        });
    }));
});
//# sourceMappingURL=bytecode.spec.js.map