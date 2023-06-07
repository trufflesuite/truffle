import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isReadErrorStorage, readErrorStorageKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.ReadErrorStorage>(
    "ReadErrorStorage"
  );
