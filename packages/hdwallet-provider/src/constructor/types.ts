/*
 * type aliases for better readability around legacy positional arguments
 */
export type MnemonicPhrase = string;
export type MnemonicPassword = string;
export interface Mnemonic {
  phrase: MnemonicPhrase;
  password?: MnemonicPassword;
}
export type PrivateKey = string;
export type Provider = any;
export type ProviderUrl = string;
export type ProviderOrUrl = Provider | ProviderUrl;
export type AddressIndex = number;
export type NumberOfAddresses = number;
export type PollingInterval = number;
export type ShareNonce = boolean;
export type DerivationPath = string;
export type ChainId = number;
export type Hardfork = string;
export type ChainSettings = {
  hardfork?: Hardfork;
  chainId?: ChainId;
};
