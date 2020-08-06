class ExtendableError {
  message: string;
  stack: string | undefined;
  name: string;

  constructor(message: string) {
    this.message = message;
    this.stack = new Error().stack;
    this.name = this.constructor.name;
  }
}

ExtendableError.prototype = Object.create(Error.prototype);
ExtendableError.prototype.constructor = ExtendableError;

export = ExtendableError;
