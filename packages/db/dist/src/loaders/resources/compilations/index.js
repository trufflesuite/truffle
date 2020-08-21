"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompilationsLoad = exports.AddCompilations = void 0;
const add_graphql_1 = require("./add.graphql");
Object.defineProperty(exports, "AddCompilations", { enumerable: true, get: function () { return add_graphql_1.AddCompilations; } });
var get_graphql_1 = require("./get.graphql");
Object.defineProperty(exports, "GetCompilation", { enumerable: true, get: function () { return get_graphql_1.GetCompilation; } });
const compilationSourceInputs = ({ compilation, sources }) => compilation.sources.map(({ input: { sourcePath } }) => sources[sourcePath]);
const compilationProcessedSourceInputs = ({ compilation, sources }) => compilation.sources.map(({ input: { sourcePath }, contracts }) => ({
    source: sources[sourcePath],
    // PRECONDITION: all contracts in the same compilation with the same
    // sourcePath must have the same AST
    ast: contracts[0].ast
        ? { json: JSON.stringify(contracts[0].ast) }
        : undefined
}));
const compilationSourceMapInputs = ({ compilation, sources }) => {
    const contracts = compilation.sources
        .map(({ contracts }) => contracts)
        .flat();
    const sourceMaps = contracts
        .map(({ sourceMap, deployedSourceMap }) => [sourceMap, deployedSourceMap])
        .flat()
        .filter(Boolean);
    if (sourceMaps.length) {
        return sourceMaps.map(sourceMap => ({ json: sourceMap }));
    }
};
const compilationInput = (data) => ({
    compiler: data.compilation.compiler,
    processedSources: compilationProcessedSourceInputs(data),
    sources: compilationSourceInputs(data),
    sourceMaps: compilationSourceMapInputs(data)
});
function* generateCompilationsLoad(loadableCompilations) {
    const compilations = loadableCompilations.map(compilationInput);
    const result = yield {
        request: add_graphql_1.AddCompilations,
        variables: { compilations }
    };
    return result.data.workspace.compilationsAdd.compilations;
}
exports.generateCompilationsLoad = generateCompilationsLoad;
//# sourceMappingURL=index.js.map