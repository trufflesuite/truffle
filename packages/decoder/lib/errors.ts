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
    this.name = "ContractAllocationFailedError";
  }
}
