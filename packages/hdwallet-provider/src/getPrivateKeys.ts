import { PrivateKey } from "./constructorTypes/types";
import { SigningAuthority } from "./constructorTypes/Constructor";

// extract the private keys if that's the style used, or return undefined
export const getPrivateKeys = (
  signingAuthority: SigningAuthority
): PrivateKey[] | undefined => {
  if ("privateKeys" in signingAuthority) {
    return signingAuthority.privateKeys;
  }
};
