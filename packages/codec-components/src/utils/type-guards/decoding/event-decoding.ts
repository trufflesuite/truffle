import type { EventDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isEventDecoding, eventDecodingKinds] =
  decodingTypeGuardHelper<EventDecoding>("event");
