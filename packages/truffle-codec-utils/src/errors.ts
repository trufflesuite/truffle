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
