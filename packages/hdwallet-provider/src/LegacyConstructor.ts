import {
  MnemonicPhrase,
  PrivateKey,
  ProviderOrUrl,
  AddressIndex,
  NumberOfAddresses,
  ShareNonce,
  DerivationPath
} from "./types";
import { NewConstructor } from "./NewConstructor";

/*
 * namespace wrapper for old-style positional arguments
 */
export namespace LegacyConstructor {
  type PossibleArguments = [
    /*
     * required
     */
    MnemonicPhrase | PrivateKey[],
    ProviderOrUrl,

    /*
     * optional
     */
    AddressIndex,
    NumberOfAddresses,
    ShareNonce,
    DerivationPath
  ];

  // (awful to have to do it this way)
  export type Arguments =
    | [PossibleArguments[0], PossibleArguments[1]]
    | [PossibleArguments[0], PossibleArguments[1], PossibleArguments[2]]
    | [
        PossibleArguments[0],
        PossibleArguments[1],
        PossibleArguments[2],
        PossibleArguments[3]
      ]
    | [
        PossibleArguments[0],
        PossibleArguments[1],
        PossibleArguments[2],
        PossibleArguments[3],
        PossibleArguments[4]
      ]
    | [
        PossibleArguments[0],
        PossibleArguments[1],
        PossibleArguments[2],
        PossibleArguments[3],
        PossibleArguments[4],
        PossibleArguments[5]
      ];

  // check that the first argument is a mnemonic phrase
  const isMnemonicPhrase = (
    mnemonicPhraseOrPrivateKeys: MnemonicPhrase | PrivateKey[]
  ): mnemonicPhraseOrPrivateKeys is MnemonicPhrase =>
    typeof mnemonicPhraseOrPrivateKeys === "string";

  // check that the first argument is a list of private keys
  const isPrivateKeys = (
    mnemonicPhraseOrPrivateKeys: MnemonicPhrase | PrivateKey[]
  ): mnemonicPhraseOrPrivateKeys is PrivateKey[] =>
    mnemonicPhraseOrPrivateKeys instanceof Array;

  // turn polymorphic first argument into { mnemonic } or { privateKeys }
  const getSigningAuthorityOptions = (
    mnemonicPhraseOrPrivateKeys: MnemonicPhrase | PrivateKey[]
  ): NewConstructor.SigningAuthority => {
    if (isMnemonicPhrase(mnemonicPhraseOrPrivateKeys)) {
      return {
        mnemonic: {
          phrase: mnemonicPhraseOrPrivateKeys
        }
      };
    } else if (isPrivateKeys(mnemonicPhraseOrPrivateKeys)) {
      return {
        privateKeys: mnemonicPhraseOrPrivateKeys
      };
    } else {
      throw new Error(
        `First argument to new HDWalletProvider() must be a mnemonic phrase or a list of private keys. ` +
          `Received: ${JSON.stringify(mnemonicPhraseOrPrivateKeys)}`
      );
    }
  };

  // convert legacy style positional arguments to new, single-arg options format
  export const toOptions = (args: Arguments): NewConstructor.Options => {
    // otherwise, if arguments match the old-style, extract properties and handle polymorphism
    const [
      mnemonicPhraseOrPrivateKeys,
      providerOrUrl,
      addressIndex,
      numberOfAddresses,
      shareNonce,
      derivationPath
    ] = args;

    const signingAuthority = getSigningAuthorityOptions(
      mnemonicPhraseOrPrivateKeys
    );

    return {
      ...signingAuthority,
      providerOrUrl,
      addressIndex,
      numberOfAddresses,
      shareNonce,
      derivationPath
    };
  };
}
