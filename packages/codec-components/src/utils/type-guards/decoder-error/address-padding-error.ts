import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isAddressPaddingError, addressPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.AddressPaddingError>(
    "AddressPaddingError"
  );
