"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSourcesLoad = exports.AddSources = void 0;
const types_1 = require("@truffle/db/loaders/types");
const add_graphql_1 = require("./add.graphql");
Object.defineProperty(exports, "AddSources", { enumerable: true, get: function () { return add_graphql_1.AddSources; } });
// returns list of IDs
function* generateSourcesLoad(compilation) {
    // for each compilation, we need to load sources for each of the contracts
    const inputs = compilation.sources.map(({ input }) => input);
    const result = yield {
        request: add_graphql_1.AddSources,
        variables: { sources: inputs }
    };
    const { sources } = result.data.workspace.sourcesAdd;
    // return source IDs mapped by sourcePath
    return sources.reduce((obj, source) => (Object.assign(Object.assign({}, obj), { [source.sourcePath]: types_1.toIdObject(source) })), {});
}
exports.generateSourcesLoad = generateSourcesLoad;
//# sourceMappingURL=index.js.map