import * as LegacyConstructor from "./legacyConstructor";
import * as Constructor from "./constructor";

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
export type ShareNonce = boolean;
export type DerivationPath = string;

/*
 * top-level polymorphic type
 */
export type ConstructorArguments =
  | LegacyConstructor.Arguments // either the old-style tuple type
  | [Constructor.Options]; // or a single argument for new-style options
