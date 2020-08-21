"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definitions = void 0;
exports.definitions = {
    contracts: {
        createIndexes: [
            {
                fields: ["compilation.id", "processedSource.index"]
            }
        ],
        idFields: ["name", "abi", "processedSource", "compilation"]
    },
    sources: {
        createIndexes: [],
        idFields: ["contents", "sourcePath"]
    },
    compilations: {
        createIndexes: [],
        idFields: ["compiler", "sources"]
    },
    bytecodes: {
        createIndexes: [],
        idFields: ["bytes", "linkReferences"]
    },
    networks: {
        createIndexes: [],
        idFields: ["networkId", "historicBlock"]
    },
    contractInstances: {
        createIndexes: [],
        idFields: ["address", "network"]
    },
    nameRecords: {
        createIndexes: [],
        idFields: ["name", "type", "resource", "previous"]
    },
    projects: {
        createIndexes: [],
        idFields: ["directory"]
    },
    projectNames: {
        createIndexes: [
            {
                fields: ["project.id"]
            },
            {
                fields: ["project.id", "type"]
            },
            {
                fields: ["project.id", "name", "type"]
            }
        ],
        idFields: ["project", "name", "type"]
    }
};
//# sourceMappingURL=definitions.js.map