import type { BytecodeDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isBytecodeDecoding, bytecodeDecodingKinds] =
  decodingTypeGuardHelper<BytecodeDecoding>("bytecode");
