//warning: copypasted from @truffle/decoder!
/**
 * This error indicates that the user attempted to instantiate an encoder
 * with no project information (by explicitly overriding the default).
 * @category Exception
 */
export class NoProjectInfoError extends Error {
  constructor() {
    super("No project information specified.");
    this.name = "NoProjectInfoError";
  }
}

/**
 * @category Exception
 * @protected
 */
export class NoInternalInfoError extends Error {
  constructor() {
    super("No compilations provided, but userDefinedTypes or allocations is missing");
    this.name = "NoInternalInfoError";
  }
}

//warning: copypasted from @truffle/decoder!
/**
 * This error indicates that an invalid address was passed to one of the
 * contract instance encoder spawners ([[forContractInstance]], etc).  Valid
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
 * This error indicates that you attempted to create a contract encoder for
 * a contract object that has not had all of its libraries linked.
 * @category Exception
 */
export class UnlinkedContractError extends Error {
  public contractName: string;
  public bytecode: string;
  public deployedBytecode: string;
  constructor(
    contractName: string,
    bytecode: string,
    deployedBytecode: string
  ) {
    super(`Contract ${contractName} has not had all its libraries linked`);
    this.contractName = contractName;
    this.bytecode = bytecode;
    this.deployedBytecode = deployedBytecode;
    this.name = "UnlinkedContractError";
  }
}

/**
 * This error indicates that the contract you are attempting to create an
 * encoder for does not appear in the project info.
 * @category Exception
 */
export class ContractNotFoundError extends Error {
  public contractName: string;
  public bytecode: string;
  public deployedBytecode: string;
  constructor(
    contractName: string,
    bytecode: string,
    deployedBytecode: string,
  ) {
    super(`Contract ${contractName} could not be found in the project information`);
    this.contractName = contractName;
    this.bytecode = bytecode;
    this.deployedBytecode = deployedBytecode;
    this.name = "ContractNotFoundError";
  }
}
