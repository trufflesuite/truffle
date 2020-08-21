"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompileLoad = void 0;
const types_1 = require("@truffle/db/loaders/types");
const bytecodes_1 = require("@truffle/db/loaders/resources/bytecodes");
const compilations_1 = require("@truffle/db/loaders/resources/compilations");
const contracts_1 = require("@truffle/db/loaders/resources/contracts");
const sources_1 = require("@truffle/db/loaders/resources/sources");
const projects_1 = require("@truffle/db/loaders/resources/projects");
const nameRecords_1 = require("@truffle/db/loaders/resources/nameRecords");
/**
 * For a compilation result from @truffle/workflow-compile/new, generate a
 * sequence of GraphQL requests to submit to Truffle DB
 *
 * Returns a generator that yields requests to forward to Truffle DB.
 * When calling `.next()` on this generator, pass any/all responses
 * and ultimately returns nothing when complete.
 */
function* generateCompileLoad(result, { directory }) {
    // start by adding loading the project resource
    const project = yield* projects_1.generateProjectLoad(directory);
    const getCurrent = function* (name, type) {
        return yield* projects_1.generateProjectNameResolve(types_1.toIdObject(project), name, type);
    };
    const resultCompilations = processResultCompilations(result);
    // for each compilation returned by workflow-compile:
    // - add sources
    // - add bytecodes
    // then, add the compilations in a single mutation
    //
    // track each compilation's bytecodes by contract
    // NOTE: this relies on array indices
    const loadableCompilations = [];
    const compilationBytecodes = [];
    for (const compilation of resultCompilations) {
        // add sources
        const sources = yield* sources_1.generateSourcesLoad(compilation);
        // add bytecodes
        const bytecodes = yield* bytecodes_1.generateBytecodesLoad(compilation);
        compilationBytecodes.push(bytecodes);
        // record compilation with its sources (bytecodes are related later)
        loadableCompilations.push({
            compilation,
            sources
        });
    }
    const compilations = yield* compilations_1.generateCompilationsLoad(loadableCompilations);
    // now time to add contracts
    //
    // again going one compilation at a time (for impl. convenience; HACK)
    // (@cds-amal reminds that "premature optimization is the root of all evil")
    for (const [compilationIndex, compilation] of compilations.entries()) {
        const resultCompilation = resultCompilations[compilationIndex];
        const bytecodes = compilationBytecodes[compilationIndex];
        const loadableContracts = [];
        for (const [sourceIndex, { contracts }] of resultCompilation.sources.entries()) {
            for (const [contractIndex, contract] of contracts.entries()) {
                loadableContracts.push({
                    contract,
                    path: { sourceIndex, contractIndex },
                    bytecodes,
                    compilation
                });
            }
        }
        const contracts = yield* contracts_1.generateContractsLoad(loadableContracts);
        const nameRecords = yield* nameRecords_1.generateNameRecordsLoad(contracts, "Contract", getCurrent);
        yield* projects_1.generateProjectNamesAssign(types_1.toIdObject(project), nameRecords);
    }
    return { project, compilations };
}
exports.generateCompileLoad = generateCompileLoad;
function processResultCompilations(result) {
    return Object.values(result.compilations)
        .filter(({ contracts }) => contracts.length > 0)
        .map(processResultCompilation);
}
function processResultCompilation({ sourceIndexes, contracts }) {
    const contractsBySourcePath = contracts.map(contract => [contract.sourcePath, contract]).reduce((obj, [sourcePath, contract]) => (Object.assign(Object.assign({}, obj), { [sourcePath]: [...(obj[sourcePath] || []), contract] })), {});
    return {
        // PRECONDITION: all contracts in the same compilation **must** have the
        // same compiler
        compiler: contracts[0].compiler,
        sources: sourceIndexes.map((sourcePath, index) => ({
            index,
            contracts: contractsBySourcePath[sourcePath],
            input: {
                // PRECONDITION: all contracts in the same compilation with the same
                // sourcePath **must** have the same source contents
                contents: contractsBySourcePath[sourcePath][0].source,
                sourcePath
            }
        }))
    };
}
//# sourceMappingURL=compile.js.map