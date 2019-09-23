import { Errors } from "../format";

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
