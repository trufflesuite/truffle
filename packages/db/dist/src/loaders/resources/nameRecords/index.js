"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNameRecordsLoad = exports.AddNameRecords = void 0;
const types_1 = require("@truffle/db/loaders/types");
const add_graphql_1 = require("./add.graphql");
Object.defineProperty(exports, "AddNameRecords", { enumerable: true, get: function () { return add_graphql_1.AddNameRecords; } });
function* generateNameRecordsLoad(resources, type, getCurrent) {
    const nameRecords = [];
    for (const resource of resources) {
        const { name } = resource;
        const current = yield* getCurrent(name, type);
        if (current) {
            nameRecords.push({
                name,
                type,
                resource: types_1.toIdObject(resource),
                previous: types_1.toIdObject(current)
            });
        }
        else {
            nameRecords.push({
                name,
                type,
                resource: types_1.toIdObject(resource)
            });
        }
    }
    const result = yield {
        request: add_graphql_1.AddNameRecords,
        variables: { nameRecords }
    };
    return result.data.workspace.nameRecordsAdd.nameRecords;
}
exports.generateNameRecordsLoad = generateNameRecordsLoad;
//# sourceMappingURL=index.js.map