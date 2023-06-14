import type { ConstructorDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isConstructorDecoding, constructorDecodingKinds] =
  decodingTypeGuardHelper<ConstructorDecoding>("constructor");
