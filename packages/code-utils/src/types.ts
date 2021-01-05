export interface Instruction {
  pc: number;
  name: string;
  pushData?: string;
};

export type opcodeObject = Instruction; //for compatibility

export interface OpcodeTable {
  [hex: number]: string;
};

export type opcodes = OpcodeTable; //for compatibility
