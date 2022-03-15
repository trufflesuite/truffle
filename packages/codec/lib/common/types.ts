import type BN from "bn.js";

/**
 * @Category Enumerations
 */
export type Location = "storage" | "memory" | "calldata";
/**
 * @Category Enumerations
 */
export type Visibility = "internal" | "external";
/**
 * @Category Enumerations
 */
export type Mutability = "pure" | "view" | "nonpayable" | "payable";
/**
 * @Category Enumerations
 */
export type ContractKind = "contract" | "library" | "interface";

/**
 * @Category Enumerations
 */
export type PaddingMode = "default" | "permissive" | "zero" | "right" | "defaultOrZero";
//default: check padding; the type of padding is determined by the type
//permissive: like default, but turns off the check on certain types
//zero: forces zero-padding even on signed types
//right: forces right-padding on all types
//defaultOrZero: allows either default or zero

/**
 * @Category Enumerations
 */
export type PaddingType = "left" | "right" | "signed" | "signedOrLeft";


/**
 * This error indicates that the decoder was unable to locate a user-defined
 * type (struct, enum, or contract type) via its ID.  Unfortunately, we can't
 * always avoid this at the moment; we're hoping to make this more robust in
 * the future with Truffle DB.  In the meantime, it is at least worth noting that
 * you should not encounter this error if your entire project was written in
 * Solidity and all compiled at once.  Sorry.
 *
 * @Category Errors
 */
export class UnknownUserDefinedTypeError extends Error {
  public typeString: string;
  public id: string;
  constructor(id: string, typeString: string) {
    const message = `Cannot locate definition for ${typeString} (ID ${id})`;
    super(message);
    this.name = "UnknownUserDefinedTypeError";
    this.id = id;
    this.typeString = typeString;
  }
}

/**
 * Type for transaction options, including
 * Quorum-specific ones (privateFor) and
 * Truffle-specific ones (overwrite)
 *
 * @Category Interfaces
 */
export interface Options {
  // NOTE: If adding options, please also add them to
  // the appropriate section of wrapOptions in
  // wrap/wrap.ts!
  // [you should just be able to add it to the appropriate
  // section for uints/addreses/bytestrings/boleans.
  // For other types you may potentially want to add new sections.
  // If it's something weird like privateFor... you may just
  // have to do things manually, sorry.]
  /**
   * This should be an address
   */
  from?: string;
  /**
   * This should be an address
   */
  to?: string;
  gas?: BN;
  gasPrice?: BN;
  maxFeePerGas?: BN;
  maxPriorityFeePerGas?: BN;
  value?: BN;
  /**
   * This should be a bytestring (even-length hex string, with "0x")
   */
  data?: string;
  nonce?: BN;
  /**
   * This represents a number, but for compatibility purposes
   * it should be given as a hex string.  It should be in the
   * range of 0x00 to 0xbf.
   */
  type?: string;
  accessList?: AccessList;
  /**
   * Quorum-specific; this should be an array of base64-encoded strings,
   * each of which encodes a 32-byte bytestring
   */
  privateFor?: string[];
  /**
   * Truffle-specific
   */
  overwrite?: boolean;
}

/**
 * Type for access lists
 *
 * @Category Interfaces
 */
export type AccessList = AccessListForAddress[];

/**
 * Type for an individual address's entry in an
 * access list
 *
 * @Category Interfaces
 */
export interface AccessListForAddress {
  /**
   * This should be an address
   */
  address: string;
  /**
   * These should be 32-byte bytestrings
   */
  storageKeys: string[];
}
