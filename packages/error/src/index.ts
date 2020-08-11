//Note: This class only exists due to weird Javascript stuff.  It should be
//ExtendableError extends Error, like errors normally are, but for some reason
//this was apparently causing problems with this.message not getting set
//correctly.  Not clear why.  Leaving it alone for now.  But we should revisit
//this later and change it to the proper way, and then eventually just get rid
//of this class altogether.
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
