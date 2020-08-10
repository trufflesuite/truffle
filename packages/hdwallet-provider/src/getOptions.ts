import { ConstructorArguments } from "./constructorTypes/ConstructorArguments";
import { toOptions } from "./toOptions";
import * as Constructor from "./constructorTypes/Constructor";
import * as LegacyConstructor from "./constructorTypes/LegacyConstructor";

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
