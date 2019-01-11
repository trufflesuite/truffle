import { ContractObject } from "truffle-contract-schema/spec";

const { parseCode } = require("truffle-code-utils");
const { getHumanReadableSourceMap } = require("truffle-solidity-utils");

export default class AbstractionAdapter {

  read({ contractName, abi, bytecode, sourceMap }: ContractObject):
    DataModel.IContractType
  {
    return {
      name: contractName || "Contract",
      abi: abi,
      compilation: null,
      createBytecode: (bytecode) ?
        {
          bytes: bytecode,
          sourceMap,
          instructions: null,
          linkReferences: []
        } :
        null
    }
  }

  readInstances(abstraction: ContractObject):
    { [networkName: string]: DataModel.IContractInstance }
  {
    const {
      contractName, abi, deployedBytecode, deployedSourceMap, networks
    } = abstraction;

    return Object.assign(
      {},
      ...Object.entries(networks || {})
        .map(
          ([ networkId, { address, transactionHash, events, links } ]) => ({
            [networkId]: {
              address,
              transactionHash,
              contractType: this.read(abstraction),
              callBytecode: (deployedBytecode) ?
                {
                  bytes: deployedBytecode,
                  sourceMap: deployedSourceMap,
                  instructions: null,
                  linkReferences: []
                } :
                null
            }
          })
        )
    );
  }

  readInstructions(bytecode: string, sourceMap: string | undefined):
    DataModel.IInstruction[]
  {
    const instructions = parseCode(bytecode);

    const sourceRanges = (sourceMap) ?
      this.readSourceMapRanges(sourceMap) :
      null;

    return instructions.map(
      (
        op: Instruction,
        index: number
      ) => Object.assign(
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

  readSourceMapRanges(sourceMap: string): DataModel.ISourceRange[] {
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
}


interface Instruction {
  pc: number,
  pushData?: string,
  name: string,
  fee: number,
  in: number,
  out: number,
  dynamic: boolean,
  async: any /* is this unused? */
}

type JumpValue = "i" | "o" | "-";

interface SourceRange {
  start: number,
  length: number,
  file: number,
  jump: JumpValue,
}
