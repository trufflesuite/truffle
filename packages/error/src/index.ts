//Note: This class only exists for compatibility with some old Javascript
//stuff that avoided using Error directly for whatever reason.  Eventually
//it should be eliminated.
class ExtendableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export = ExtendableError;
