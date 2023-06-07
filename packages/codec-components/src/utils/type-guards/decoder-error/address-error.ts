import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { addressPaddingErrorKinds } from "./address-padding-error";

export const [isAddressError, addressErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.AddressError>(
    ...addressPaddingErrorKinds
  );
