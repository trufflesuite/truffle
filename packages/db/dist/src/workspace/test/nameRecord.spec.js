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
const nameRecord_graphql_1 = require("./nameRecord.graphql");
const network_graphql_1 = require("./network.graphql");
describe("Name Record", () => {
    let wsClient;
    let expectedId;
    let variables, addNameRecordResult;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        wsClient = new utils_1.WorkspaceClient();
        let addNetworkResult = yield wsClient.execute(network_graphql_1.AddNetworks, {
            name: "ganache",
            networkId: Object.keys(utils_1.Migrations.networks)[0],
            height: 1,
            hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6"
        });
        let addNetworkId = addNetworkResult.networksAdd.networks[0].id;
        variables = {
            name: "ganache",
            type: "Network",
            resource: {
                id: addNetworkId
            }
        };
        expectedId = utils_1.generateId(variables);
        addNameRecordResult = yield wsClient.execute(nameRecord_graphql_1.AddNameRecord, variables);
    }));
    test("can be added", () => __awaiter(void 0, void 0, void 0, function* () {
        expect(addNameRecordResult).toHaveProperty("nameRecordsAdd");
        const { nameRecordsAdd } = addNameRecordResult;
        expect(nameRecordsAdd).toHaveProperty("nameRecords");
        const { nameRecords } = nameRecordsAdd;
        expect(nameRecords).toHaveLength(1);
        const nameRecord = nameRecords[0];
        expect(nameRecord).toHaveProperty("id");
        const { id } = nameRecord;
        expect(id).toEqual(expectedId);
    }));
    test("can be queried", () => __awaiter(void 0, void 0, void 0, function* () {
        const executionResult = yield wsClient.execute(nameRecord_graphql_1.GetNameRecord, {
            id: expectedId
        });
        expect(executionResult).toHaveProperty("nameRecord");
        const { nameRecord } = executionResult;
        expect(nameRecord).toHaveProperty("id");
        const { id, resource } = nameRecord;
        expect(id).toEqual(expectedId);
        expect(resource).toHaveProperty("networkId");
        expect(resource.id).toEqual(variables.resource.id);
    }));
    test("can retrieve all name records", () => __awaiter(void 0, void 0, void 0, function* () {
        const executionResult = yield wsClient.execute(nameRecord_graphql_1.GetAllNameRecords);
        expect(executionResult).toHaveProperty("nameRecords");
        const { nameRecords } = executionResult;
        expect(nameRecords).toHaveProperty("length");
        nameRecords.forEach(nr => {
            expect(nr).toHaveProperty("id");
            expect(nr).toHaveProperty("resource");
        });
    }));
});
//# sourceMappingURL=nameRecord.spec.js.map