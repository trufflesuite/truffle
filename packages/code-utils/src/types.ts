export interface Instruction {
  pc: number;
  name: string;
  pushData?: string;
}

export interface OpcodeTable {
  [hex: number]: string;
}

export interface DisassemblyOptions {
  maxInstructionCount?: number;
  attemptStripMetadata?: boolean;
}
