import {
  Mnemonic,
  PrivateKey,
  ProviderOrUrl,
  AddressIndex,
  NumberOfAddresses,
  ShareNonce,
  DerivationPath
} from "./types";

/*
 * namespace wrapper for new constructor options interface
 */
export namespace NewConstructor {
  export interface MnemonicSigningAuthority {
    mnemonic: Mnemonic;
  }

  export interface PrivateKeySigningAuthority {
    privateKeys: PrivateKey[];
  }

  export type SigningAuthority =
    | MnemonicSigningAuthority
    | PrivateKeySigningAuthority;

  export interface CommonOptions {
    providerOrUrl: ProviderOrUrl;
    addressIndex?: AddressIndex;
    numberOfAddresses?: NumberOfAddresses;
    shareNonce?: ShareNonce;
    derivationPath?: DerivationPath;
  }

  export type Options = SigningAuthority & CommonOptions;

  // extract the mnemonic if that's the style used, or return undefined
  export const getMnemonic = (
    signingAuthority: SigningAuthority
  ): Mnemonic | undefined => {
    if ("mnemonic" in signingAuthority) {
      return signingAuthority.mnemonic;
    }
  };

  // extract the private keys if that's the style used, or return undefined
  export const getPrivateKeys = (
    signingAuthority: SigningAuthority
  ): PrivateKey[] | undefined => {
    if ("privateKeys" in signingAuthority) {
      return signingAuthority.privateKeys;
    }
  };
}
