import { Values } from "truffle-codec-utils";

export class UnknownBaseContractIdError extends Error {
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

//used to stop decoding; apologies for the lack of details in this one,
//but this one is actually meant to be used for control flow rather than
//display, so I'm hoping that's OK
export class StopDecodingError extends Error {
  constructor() {
    const message = `Stopping decoding!`;
    super(message);
  }
}
