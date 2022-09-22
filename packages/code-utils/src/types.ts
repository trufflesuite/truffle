export interface Instruction {
  pc: number;
  name: string;
  pushData?: string;
}

export interface DisassemblyOptions {
  maxInstructionCount?: number;
  attemptStripMetadata?: boolean;
}
