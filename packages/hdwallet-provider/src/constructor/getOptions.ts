import type { MnemonicPhrase, PrivateKey } from "./types";
import type { ConstructorArguments } from "./ConstructorArguments";
import type * as Constructor from "./Constructor";
import type * as LegacyConstructor from "./LegacyConstructor";

// check that the first argument is a mnemonic phrase
const isMnemonicLike = (
  credentials: LegacyConstructor.Credentials
): credentials is MnemonicPhrase => {
  return typeof credentials === "string" && credentials.includes(" ");
};

// check that the first argument is a list of private keys
const isPrivateKeysLike = (
  credentials: LegacyConstructor.Credentials
): credentials is PrivateKey[] => credentials instanceof Array;

// check that the first argument is a single private key (default case for invalid mnemonics)
const isPrivateKeyLike = (
  credentials: LegacyConstructor.Credentials
): credentials is PrivateKey =>
  typeof credentials === "string" &&
  credentials.length === 64 &&
  // this is added since parseInt(mnemonic) should equal NaN (unless it starts
  // with a-f) and private keys should parse into a valid number - this will
  // also parse with the largest hex value, namely "f" * 64
  isFinite(parseInt(credentials, 16)) &&
  !credentials.includes(" ");

// turn polymorphic first argument into { mnemonic } or { privateKeys }
const getSigningAuthorityOptions = (
  credentials: LegacyConstructor.Credentials
): Constructor.SigningAuthority => {
  if (isPrivateKeyLike(credentials)) {
    return {
      privateKeys: [credentials]
    };
  } else if (isPrivateKeysLike(credentials)) {
    return {
      privateKeys: credentials
    };
  } else if (isMnemonicLike(credentials)) {
    return {
      mnemonic: {
        phrase: credentials
      }
    };
  } else {
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
};

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
  const [options] = args;
  // new-style means exactly one argument and an object
  if (args.length !== 1 || typeof options !== "object") return false;

  // beyond that, determine based on property inclusion check for required keys
  return (
    ("providerOrUrl" in options || "provider" in options || "url" in options) &&
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
    const message =
      "Unknown arguments format passed to new HDWalletProvider. " +
      "Please ensure you passed provider information along with either a " +
      "mnemonic or private keys.";
    throw new Error(message);
  }
};
