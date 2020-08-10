import { MnemonicPhrase, PrivateKey } from "./types";
import { ConstructorArguments } from "./ConstructorArguments";
import * as Constructor from "./Constructor";
import * as LegacyConstructor from "./LegacyConstructor";

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
const toOptions = (
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
// type predicate guard to determine at runtime if arguments conform to
// new-style constructor args.
const matchesNewOptions = (
  args: ConstructorArguments
): args is [Constructor.Options] => {
  // new-style means exactly one argument
  if (args.length !== 1) {
    return false;
  }

  const [options] = args;

  // beyond that, determine based on property inclusion check for required keys
  return (
    "providerOrUrl" in options &&
    ("mnemonic" in options || "privateKeys" in options)
  );
};

// type predicate guard to determine at runtime if arguments conform to
// old-style constructor args.
const matchesLegacyArguments = (
  args: ConstructorArguments
): args is LegacyConstructor.Arguments =>
  // first check for alternate (new-style) case for basic determination
  !matchesNewOptions(args) &&
  // then additionally make sure we have the two required options we need
  args.filter(arg => arg !== undefined).length >= 2;

// normalize arguments passed to constructor to match single, new-style options
// argument
export const getOptions = (
  ...args: ConstructorArguments
): Constructor.Options => {
  if (matchesNewOptions(args)) {
    // if arguments already match new-style, no real transformation needed
    const [options] = args;
    return options;
  } else if (matchesLegacyArguments(args)) {
    return toOptions(args);
  } else {
    throw new Error(
      "Unknown arguments format passed to new HDWalletProvider. Please check your configuration and try again"
    );
  }
};
