import type { SigningAuthority } from "./Constructor";
import type { Mnemonic } from "./types";

// extract the mnemonic if that's the style used, or return undefined
export const getMnemonic = (
  signingAuthority: SigningAuthority
): Mnemonic | undefined => {
  if ("mnemonic" in signingAuthority) {
    return signingAuthority.mnemonic;
  }
};
