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

export interface PrivateKeysSigningAuthority {
  privateKeys?: PrivateKey[];
  privateKey?: PrivateKey;
}

export type SigningAuthority =
  | MnemonicSigningAuthority
  | PrivateKeysSigningAuthority;

export interface CommonOptions {
  providerOrUrl: ProviderOrUrl;
  addressIndex?: AddressIndex;
  numberOfAddresses?: NumberOfAddresses;
  shareNonce?: ShareNonce;
  derivationPath?: DerivationPath;
}

export type Options = SigningAuthority & CommonOptions;
