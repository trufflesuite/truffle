import { MnemonicPhrase, PrivateKey } from "./constructorTypes/types";
import * as Constructor from "./constructorTypes/Constructor";
import * as LegacyConstructor from "./constructorTypes/LegacyConstructor";

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
): Constructor.SigningAuthority => {
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
export const toOptions = (
  args: LegacyConstructor.Arguments
): Constructor.Options => {
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
