import type {
  MnemonicPhrase,
  PrivateKey,
  ProviderOrUrl,
  AddressIndex,
  NumberOfAddresses,
  ShareNonce,
  DerivationPath,
  ChainId
} from "./types";

export type Credentials = MnemonicPhrase | PrivateKey | PrivateKey[];

/*
 * namespace wrapper for old-style positional arguments
 */
type PossibleArguments = [
  /*
   * required
   */
  Credentials,
  ProviderOrUrl,

  /*
   * optional
   */
  AddressIndex,
  NumberOfAddresses,
  ShareNonce,
  DerivationPath,
  ChainId
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
    ]
  | [
      PossibleArguments[0],
      PossibleArguments[1],
      PossibleArguments[2],
      PossibleArguments[3],
      PossibleArguments[4],
      PossibleArguments[5],
      PossibleArguments[6]
    ];
