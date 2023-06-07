import type { ReturndataDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";
import { returnDecodingKinds } from "./return-decoding";
import { rawReturnDecodingKinds } from "./raw-return-decoding";
import { bytecodeDecodingKinds } from "./bytecode-decoding";
import { unknownBytecodeDecodingKinds } from "./unknown-bytecode-decoding";
import { selfDestructDecodingKinds } from "./self-destruct-decoding";
import { revertMessageDecodingKinds } from "./revert-message-decoding";
import { emptyFailureDecodingKinds } from "./empty-failure-decoding";

export const [isReturndataDecoding, returndataDecodingKinds] =
  decodingTypeGuardHelper<ReturndataDecoding>(
    ...returnDecodingKinds,
    ...rawReturnDecodingKinds,
    ...bytecodeDecodingKinds,
    ...unknownBytecodeDecodingKinds,
    ...selfDestructDecodingKinds,
    ...revertMessageDecodingKinds,
    ...emptyFailureDecodingKinds
  );
