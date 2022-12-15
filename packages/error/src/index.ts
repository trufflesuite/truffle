class TruffleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.stack = "";
  }
}

export = TruffleError;
