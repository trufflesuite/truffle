export type opcodeObject = {
  pc?: number;
  name?: string;
  pushData?: Array<number> | string;
};
export type opcodes = {
  [hex: number]: string;
};

declare namespace CodeUtils {
  function parseCode(
    hexString: string,
    numInstructions?: number
  ): Array<opcodeObject>;
}

export default CodeUtils;
