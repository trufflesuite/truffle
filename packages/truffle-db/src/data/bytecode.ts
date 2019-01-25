const { parseCode } = require("truffle-code-utils");
const { getHumanReadableSourceMap } = require("truffle-solidity-utils");

export interface Instruction {
  pc: number,
  pushData?: string,
  name: string,
  fee: number,
  in: number,
  out: number,
  dynamic: boolean,
  async: any /* is this unused? */
}

export type JumpValue = "i" | "o" | "-";

export interface SourceRange {
  start: number,
  length: number,
  file: number,
  jump: JumpValue,
}

export function readInstructions(
  bytecode: string,
  sourceMap: string | undefined
):
  DataModel.IInstruction[]
{
  const instructions = parseCode(bytecode);

  const sourceRanges = (sourceMap) ? readSourceMapRanges(sourceMap) : null;

  return instructions.map(
    (op: Instruction, index: number) => Object.assign(
      {
        programCounter: op.pc,
        opcode: op.name,
        meta: {
          cost: op.fee,
          pops: op.in,
          pushes: op.out,
          dynamic: op.dynamic
        }
      },

      (op.pushData) ? { pushData: op.pushData } : {},
      (sourceRanges) ? { sourceRange: sourceRanges[index] } : {}
    )
  );
}

function readSourceMapRanges(sourceMap: string): DataModel.ISourceRange[] {
  const humanReadableSourceMap = getHumanReadableSourceMap(sourceMap);

  const convertMeta = (jump: JumpValue): { jump?: string } => {
    switch(jump) {
      case "i":
        return { jump: "IN" };
      case "o":
        return { jump: "OUT" };
      case "-":
        return { }
    }
  };

  return humanReadableSourceMap
    .map( ({ start, length, jump }: SourceRange) => ({
      start,
      length,
      meta: convertMeta(jump)
    }));
}
