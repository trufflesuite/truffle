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
