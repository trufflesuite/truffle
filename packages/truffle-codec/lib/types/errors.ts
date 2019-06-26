import { AbiUtils } from "truffle-codec-utils";

export class UnknownBaseContractIdError extends Error {
  public derivedId: number;
  public derivedName: string;
  public derivedKind: string;
  public baseId: number;
  constructor(derivedId: number, derivedName: string, derivedKind: string, baseId: number) {
    const message = `Cannot locate base contract ID ${baseId} of ${derivedKind} ${derivedName} (ID ${derivedId})`;
    super(message);
    this.name = "UnknownBaseContractIdError";
    this.derivedId = derivedId;
    this.derivedName = derivedName;
    this.derivedKind = derivedKind;
    this.baseId = baseId;
  }
}

export class NoDefinitionFoundForABIEntryError extends Error {
  public abiEntry: AbiUtils.AbiEntry;
  public contractsSearched: number[];
  constructor(abiEntry: AbiUtils.AbiEntry, contractsSearched: number[]) {
    let abiString;
    switch(abiEntry.type) {
      case "function":
      case "event":
        abiString = AbiUtils.abiSignature(abiEntry);
        break;
      case "constructor":
        abiString = "constructor" + AbiUtils.abiTupleSignature(abiEntry.inputs);
        break;
      case "fallback":
        abiString = "fallback";
        break;
    }
    const contractsString = contractsSearched.join(", ");
    const message = `Cannot locate AST node matching ABI entry ${abiString} in contract ID(s) ${contractsString}`;
    super(message);
    this.name = "NoDefinitionFoundForABIEntryError";
    this.abiEntry = abiEntry;
    this.contractsSearched = contractsSearched;
  }
}

//used to stop decoding; apologies for the lack of details in this one,
//but this one is actually meant to be used for control flow rather than
//display, so I'm hoping that's OK
export class StopDecodingError extends Error {
  constructor() {
    const message = `Stopping decoding!`;
    super(message);
  }
}
