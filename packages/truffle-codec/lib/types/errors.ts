import { AbiUtils, Errors } from "truffle-codec-utils";

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

//used to stop decoding; like DecodingError, but used in contexts
//where I don't expect it to be caught
//NOTE: currently we don't actually check the type of a thrown error,
//we just rely on context.  still, I think it makes sense to be a separate
//type.
export class StopDecodingError extends Error {
  public error: Errors.DecoderError;
  public allowRetry: boolean; //setting this to true means that, if the error occurs
  //when decoding in full mode, we allow an ABI-mode retry.  (if we were already in
  //ABI mode, we give up.)
  constructor(error: Errors.DecoderError, allowRetry?: boolean) {
    const message = `Stopping decoding: ${error.kind}`; //sorry about the bare-bones message,
    //but again, users shouldn't actually see this, so I think this should suffice for now
    super(message);
    this.error = error;
    this.allowRetry = Boolean(allowRetry);
  }
}
