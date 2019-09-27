export class ContractBeingDecodedHasNoNodeError extends Error {
  public contractName: string;
  constructor(contractName: string) {
    const message = `Contract ${contractName} does not appear to have been compiled with Solidity (cannot locate contract node)`;
    super(message);
    this.name = "ContractBeingDecodedHasNoNodeError";
  }
}

export class ContractAllocationFailedError extends Error {
  public id: number;
  public contractName: string;
  constructor(id: number, contractName: string) {
    super(`No allocation found for contract ID ${id} (${contractName})`);
    this.name = "ContractAllocationFailedError";
  }
}

