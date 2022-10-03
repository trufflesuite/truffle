/**
 * The raw information for an internal function pointer can take two forms.
 * In non-IR Solidity, it's given as a pair of program counter values (one
 * for the constructor context and one for the deployed context).  In IR-based
 * Solidity, it's given as an index into a jump table.
 *
 * @Category Function types
 */
export type FunctionInternalRawInfo =
  | FunctionInternalRawInfoPcPair
  | FunctionInternalRawInfoIndex;

/**
 * In non-IR Solidity, the raw information for an internal function pointer is
 * given as pair of program counter values; one for the constructor context and
 * one for the deployed context).
 *
 * @Category Function types
 */
export interface FunctionInternalRawInfoPcPair {
  kind: "pcpair";
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

/**
 * In IR-based Solidity, the raw information for an internal function pointer is
 * given as an index into a jump table.
 *
 * @Category Function types
 */
export interface FunctionInternalRawInfoIndex {
  kind: "index";
  functionIndex: number;
}
