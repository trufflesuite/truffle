/**
 * This error indicates that the contract you are attempting to decode does not have AST
 * information associated with it, or that the decoder cannot find it.  This error will
 * be thrown if you attempt to use functions that require AST information with such a contract.
 * @category Exception
 */
export class ContractBeingDecodedHasNoNodeError extends Error {
  public contractName: string;
  constructor(contractName: string) {
    const message = `Contract ${contractName} does not appear to have been compiled with Solidity (cannot locate contract node)`;
    super(message);
    this.contractName = contractName;
    this.name = "ContractBeingDecodedHasNoNodeError";
  }
}

/**
 * This error indicates that something went wrong while attempting to determine the location
 * of this contract's state variables.  This error will be thrown if you attempt to use
 * decoding functions after something went wrong during setup.  Unfortunately, we can't
 * always avoid this at the moment; we're hoping to make this more robust in the future
 * with Truffle DB.  In the meantime, it is at least worth noting that you should not encounter
 * this error if your entire project was written in Solidity and all compiled at once.  Sorry.
 * @category Exception
 */
export class ContractAllocationFailedError extends Error {
  public id: number;
  public contractName: string;
  constructor(id: number, contractName: string) {
    super(`No allocation found for contract ID ${id} (${contractName})`);
    this.id = id;
    this.contractName = contractName;
    this.name = "ContractAllocationFailedError";
  }
}

/**
 * This error indicates that an invalid address was passed to one of the
 * contract instance decoder spawners ([[forContractInstance]], etc).  Valid
 * addresses are those that Web3 accepts; i.e., either those with correct
 * checksums, or those that are all-lowercase or all-uppercase to deliberately
 * circumvent the checksum.
 * @category Exception
 */
export class InvalidAddressError extends Error {
  public address: string;
  constructor(address: string) {
    super(`Invalid address ${address}`);
    this.address = address;
    this.name = "InvalidAddressError";
  }
}

/**
 * This error indicates that the user requested a variable that does not exist.
 * @category Exception
 */
export class VariableNotFoundError extends Error {
  public nameOrId: string | number;
  constructor(nameOrId: string | number) {
    super(`No such variable ${nameOrId}`);
    this.nameOrId = nameOrId;
    this.name = "VariableNotFoundError";
  }
}
