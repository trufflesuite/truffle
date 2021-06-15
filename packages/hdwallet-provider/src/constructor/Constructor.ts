import type {
  Mnemonic,
  MnemonicPhrase,
  PrivateKey,
  ProviderOrUrl,
  AddressIndex,
  NumberOfAddresses,
  PollingInterval,
  ShareNonce,
  DerivationPath,
  ChainId,
  ChainSettings
} from "./types";

/*
 * namespace wrapper for constructor options interface
 */

export interface MnemonicSigningAuthority {
  mnemonic: Mnemonic;
}

export interface MnemonicPhraseSigningAuthority {
  mnemonic: MnemonicPhrase;
}

export interface PrivateKeysSigningAuthority {
  privateKeys: PrivateKey[];
}

export type SigningAuthority =
  | MnemonicSigningAuthority
  | PrivateKeysSigningAuthority;

export type InputSigningAuthority =
  | MnemonicSigningAuthority
  | MnemonicPhraseSigningAuthority
  | PrivateKeysSigningAuthority;

export interface CommonOptions {
  providerOrUrl: ProviderOrUrl;
  addressIndex?: AddressIndex;
  numberOfAddresses?: NumberOfAddresses;
  shareNonce?: ShareNonce;
  derivationPath?: DerivationPath;
  pollingInterval?: PollingInterval;
  chainId?: ChainId;
  chainSettings?: ChainSettings;
}

export type Options = SigningAuthority & CommonOptions;
export type InputOptions = InputSigningAuthority & CommonOptions;
