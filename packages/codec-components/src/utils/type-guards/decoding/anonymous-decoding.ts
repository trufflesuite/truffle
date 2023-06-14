import type { AnonymousDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isAnonymousDecoding, anonymousDecodingKinds] =
  decodingTypeGuardHelper<AnonymousDecoding>("anonymous");
