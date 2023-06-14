import type { LogDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";
import { eventDecodingKinds } from "./event-decoding";
import { anonymousDecodingKinds } from "./anonymous-decoding";

export const [isLogDecoding, logDecodingKinds] =
  decodingTypeGuardHelper<LogDecoding>(
    ...eventDecodingKinds,
    ...anonymousDecodingKinds
  );
