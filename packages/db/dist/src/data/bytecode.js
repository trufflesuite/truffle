"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readInstructions = void 0;
const { parseCode } = require("@truffle/code-utils");
const { getHumanReadableSourceMap } = require("@truffle/solidity-utils");
function readInstructions(bytecode, sourceMap) {
    const instructions = parseCode(bytecode);
    const sourceRanges = sourceMap ? readSourceMapRanges(sourceMap) : null;
    return instructions.map((op, index) => Object.assign({
        programCounter: op.pc,
        opcode: op.name,
        meta: {
            cost: op.fee,
            pops: op.in,
            pushes: op.out,
            dynamic: op.dynamic
        }
    }, op.pushData ? { pushData: op.pushData } : {}, sourceRanges ? { sourceRange: sourceRanges[index] } : {}));
}
exports.readInstructions = readInstructions;
function readSourceMapRanges(sourceMap) {
    const humanReadableSourceMap = getHumanReadableSourceMap(sourceMap);
    const convertMeta = (jump) => {
        switch (jump) {
            case "i":
                return { jump: "IN" };
            case "o":
                return { jump: "OUT" };
            case "-":
                return {};
        }
    };
    return humanReadableSourceMap.map(({ start, length, jump }) => ({
        start,
        length,
        meta: convertMeta(jump)
    }));
}
//# sourceMappingURL=bytecode.js.map