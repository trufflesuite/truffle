import * as Evm from "@truffle/codec/evm";
import * as Pointer from "@truffle/codec/pointer";

export function readSpecial(
  pointer: Pointer.SpecialPointer,
  state: Evm.EvmState
): Uint8Array {
  //not bothering with error handling on this one as I don't expect errors
  return state.specials[pointer.special];
}
