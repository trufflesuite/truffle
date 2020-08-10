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
 * namespace wrapper for constructor options interface
 */
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
