import type { PrivateKey } from "./types";
import type { SigningAuthority } from "./Constructor";

// extract the private keys if that's the style used, or return undefined
export const getPrivateKeys = (
  signingAuthority: SigningAuthority
): PrivateKey[] | undefined => {
  if ("privateKeys" in signingAuthority) {
    return signingAuthority.privateKeys;
  } else {
    return undefined;
  }
};
