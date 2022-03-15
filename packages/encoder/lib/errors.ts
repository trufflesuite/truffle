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

/**
 * @category Exception
 * @protected
 */
export class NoCompilationsForSpawnerError extends Error {
  constructor() {
    super("Contract decoders cannot be spawned without compilations info");
    this.name = "NoCompilationsForSpawnerError";
  }
}

/**
 * @category Exception
 * @protected
 */
export class NoFunctionByThatNameError extends Error {
  public functionName: string;
  public contractName: string | undefined;
  constructor(functionName: string, contractName: string) {
    const message = contractName
      ? `Contract ${contractName} has no function named ${functionName}`
      : `This contract has no function named ${functionName}`
    super(message);
    this.functionName = functionName;
    this.contractName = contractName;
    this.name = "NoFunctionByThatNameError";
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
 * This error indicates that you attempted to encode a contract creation
 * transaction for a contract that has not had all of its libraries linked.
 * @category Exception
 */
export class UnlinkedContractError extends Error {
  public contractName: string | undefined;
  public bytecode: string | undefined;
  constructor(
    contractName: string | undefined,
    bytecode: string | undefined,
  ) {
    const nameString = contractName !== undefined
      ? contractName + " "
      : "";
    super(`Contract ${nameString}has not had all its libraries linked`);
    this.contractName = contractName;
    this.bytecode = bytecode;
    this.name = "UnlinkedContractError";
  }
}

/**
 * This error indicates that you attempted to use address autodetection
 * for a contract that isn't deployed to the current network.
 * @category Exception
 */
export class ContractNotDeployedError extends Error {
  public contractName: string | undefined;
  public networkId: number;
  constructor(
    contractName: string | undefined,
    networkId: number
  ) {
    const nameString = contractName !== undefined
      ? contractName + " "
      : "";
    super(`Contract ${nameString}has not been deployed to network ${networkId} with deployer; address must be given explicitly`);
    this.contractName = contractName;
    this.name = "ContractNotDeployedError";
  }
}

/**
 * This error indicates that you attempted to encode a contract creation
 * transaction for a contract that lacks constructor bytecode.
 * @category Exception
 */
export class NoBytecodeError extends Error {
  public contractName: string | undefined;
  constructor(
    contractName: string | undefined,
  ) {
    const nameString = contractName !== undefined
      ? contractName + " "
      : "";
    super(`Contract ${nameString}has missing or empty constructor bytecode`);
    this.contractName = contractName;
    this.name = "NoBytecodeError";
  }
}

/**
 * This error indicates that the user attempted to do something that
 * requires a network ID (e.g.: autodetect an address for a deployed
 * contract) when no network ID or provider was set.
 * @category Exception
 */
export class NoNetworkError extends Error {
  constructor() {
    super("This operation requires a provider or network ID.");
    this.name = "NoNetworkError";
  }
}

/**
 * This error indicates that the contract you are attempting to create an
 * encoder for does not appear in the project info.
 * @category Exception
 */
export class ContractNotFoundError extends Error {
  public contractName: string | undefined;
  public bytecode: string | undefined;
  public deployedBytecode: string | undefined;
  public address: string | undefined;
  constructor(
    contractName: string | undefined,
    bytecode: string | undefined,
    deployedBytecode: string | undefined,
    address?: string
  ) {
    let message;
    if (contractName) {
      message = `Contract ${contractName} could not be found in the project information`;
    } else if (address) {
      message = `Contract at ${address} could not be found in the project information`;
    } else {
      message = `Contract could not be found in the project information`;
    }
    super(message);
    this.contractName = contractName;
    this.bytecode = bytecode;
    this.deployedBytecode = deployedBytecode;
    this.name = "ContractNotFoundError";
  }
}
