export interface Instruction {
  pc: number;
  pushData?: string;
  name: string;
  fee: number;
  in: number;
  out: number;
  dynamic: boolean;
  async: any;
}
export declare type JumpValue = "i" | "o" | "-";
export interface SourceRange {
  start: number;
  length: number;
  file: number;
  jump: JumpValue;
}
export declare function readInstructions(
  bytecode: string,
  sourceMap: string | undefined
): DataModel.IInstruction[];
