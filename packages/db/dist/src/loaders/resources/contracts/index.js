"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContractsLoad = exports.AddContracts = void 0;
const add_graphql_1 = require("./add.graphql");
Object.defineProperty(exports, "AddContracts", { enumerable: true, get: function () { return add_graphql_1.AddContracts; } });
function* generateContractsLoad(loadableContracts) {
    const contracts = loadableContracts.map(loadableContract => {
        const { contract: { contractName: name, abi: abiObject }, path: { sourceIndex, contractIndex }, bytecodes, compilation } = loadableContract;
        const { createBytecode, callBytecode } = bytecodes.sources[sourceIndex].contracts[contractIndex];
        return {
            name,
            abi: {
                json: JSON.stringify(abiObject)
            },
            compilation,
            processedSource: { index: sourceIndex },
            createBytecode: createBytecode,
            callBytecode: callBytecode
        };
    });
    const result = yield {
        request: add_graphql_1.AddContracts,
        variables: { contracts }
    };
    return result.data.workspace.contractsAdd.contracts;
}
exports.generateContractsLoad = generateContractsLoad;
//# sourceMappingURL=index.js.map