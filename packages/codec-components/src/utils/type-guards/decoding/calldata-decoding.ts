import type { CalldataDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";
import { functionDecodingKinds } from "./function-decoding";
import { constructorDecodingKinds } from "./constructor-decoding";
import { messageDecodingKinds } from "./message-decoding";
import { unknownCallDecodingKinds } from "./unknown-call-decoding";
import { unknownCreationDecodingKinds } from "./unknown-creation-decoding";

export const [isCalldataDecoding, calldataDecodingKinds] =
  decodingTypeGuardHelper<CalldataDecoding>(
    ...functionDecodingKinds,
    ...constructorDecodingKinds,
    ...messageDecodingKinds,
    ...unknownCallDecodingKinds,
    ...unknownCreationDecodingKinds
  );
