export class UnknownBaseContractIdError extends Error {
  public name: string;
  public derivedId: number;
  public derivedName: string;
  public derivedKind: string;
  public baseId: number;
  constructor(derivedId: number, derivedName: string, derivedKind: string, baseId: number) {
    const message = `Cannot locate base contract ID ${baseId}$ of ${derivedKind}$ ${derivedName} (ID ${derivedId})`;
    super(message);
    this.name = "UnknownBaseContractIdError";
    this.derivedId = derivedId;
    this.derivedName = derivedName;
    this.derivedKind = derivedKind;
    this.baseId = baseId;
  }
}

export class UnknownUserDefinedTypeError extends Error {
  public name: string;
  public typeString: string;
  public id: number;
  constructor(id: number, typeString: string) {
    const message = `Cannot locate definition for ${typeString}$ (ID ${id})`;
    super(message);
    this.name = "UnknownUserDefinedTypeError";
    this.id = id;
    this.typeString = typeString;
  }
}

export class ContractBeingDecodedHasNoNodeError extends Error {
  public name: string;
  constructor() {
    const message = "Contract does not appear to have been compiled with Solidity (cannot locate contract node)";
    super(message);
    this.name = "ContractBeingDecodedHasNoNodeError";
  }
}
