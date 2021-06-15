import type { MnemonicPhrase, PrivateKey } from "./types";
import type { ConstructorArguments } from "./ConstructorArguments";
import type * as Constructor from "./Constructor";
import type * as LegacyConstructor from "./LegacyConstructor";
import { validateMnemonic } from "ethereum-cryptography/bip39";
import { wordlist } from "ethereum-cryptography/bip39/wordlists/english";

// check that the first argument is a mnemonic phrase
const isMnemonicPhrase = (
  credentials: LegacyConstructor.Credentials
): credentials is MnemonicPhrase =>
  typeof credentials === "string" &&
  validateMnemonic(credentials, wordlist);

// check that the first argument is a list of private keys
const isPrivateKeys = (
  credentials: LegacyConstructor.Credentials
): credentials is PrivateKey[] =>
  credentials instanceof Array;

// check that the first argument is a single private key (default case for invalid mnemonics)
const isPrivateKey = (
  credentials: LegacyConstructor.Credentials
): credentials is PrivateKey =>
  !isPrivateKeys(credentials) &&
  !isMnemonicPhrase(credentials);

// turn polymorphic first argument into { mnemonic } or { privateKeys }
const getSigningAuthorityOptions = (
  credentials: LegacyConstructor.Credentials
): Constructor.SigningAuthority => {
  if (isMnemonicPhrase(credentials)) {
    return {
      mnemonic: {
        phrase: credentials
      }
    };
  } else if (isPrivateKeys(credentials)) {
    return {
      privateKeys: credentials
    };
  } else if (isPrivateKey(credentials)) { // if(...) included for explicitness
    return {
      privateKeys: [credentials]
    };
  } else { // this won't be reached until/unless we validate private key(s)
    throw new Error(
      `First argument to new HDWalletProvider() must be a mnemonic phrase, a ` +
      `single private key, or a list of private keys. ` +
        `Received: ${JSON.stringify(credentials)}`
    );
  }
};

const fromInputOptions = (
  options: Constructor.InputOptions
): Constructor.Options => {
  if ("mnemonic" in options && typeof options.mnemonic === "string") {
    return {
      ...options,
      mnemonic: {
        phrase: options.mnemonic
      }
    };
  } else {
    return options as Constructor.Options;
  }
}

// convert legacy style positional arguments to new, single-arg options format
const fromArguments = (
  args: LegacyConstructor.Arguments
): Constructor.Options => {
  // otherwise, if arguments match the old-style, extract properties and handle polymorphism
  const [
    mnemonicPhraseOrPrivateKeys,
    providerOrUrl,
    addressIndex,
    numberOfAddresses,
    shareNonce,
    derivationPath,
    chainId
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
    derivationPath,
    chainId
  };
};

// type predicate guard to determine at runtime if arguments conform to
// new-style constructor args.
const matchesNewInputOptions = (
  args: ConstructorArguments
): args is [Constructor.InputOptions] => {
  // new-style means exactly one argument
  if (args.length !== 1) {
    return false;
  }

  const [options] = args;

  // beyond that, determine based on property inclusion check for required keys
  return (
    "providerOrUrl" in options &&
    ("privateKeys" in options || "mnemonic" in options)
  );
};



// type predicate guard to determine at runtime if arguments conform to
// old-style constructor args.
const matchesLegacyArguments = (
  args: ConstructorArguments
): args is LegacyConstructor.Arguments =>
  // first check for alternate (new-style) case for basic determination
  !matchesNewInputOptions(args) &&
  // then additionally make sure we have the two required options we need
  args.filter(arg => arg !== undefined).length >= 2;

// normalize arguments passed to constructor to match single, new-style options
// argument
export const getOptions = (
  ...args: ConstructorArguments
): Constructor.Options => {
  if (matchesNewInputOptions(args)) {
    // if arguments already match new-style, no real transformation needed
    const [options] = args;
    return fromInputOptions(options);
  } else if (matchesLegacyArguments(args)) {
    return fromArguments(args);
  } else {
    throw new Error(
      "Unknown arguments format passed to new HDWalletProvider. Please check your configuration and try again"
    );
  }
};
