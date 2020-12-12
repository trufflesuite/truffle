import colors from "colors";
import TruffleError from "@truffle/error";

export class CompileError extends TruffleError {
  public message: string;
  constructor(message: string) {
    // Note we trim() because solc likes to add extra whitespace.
    var fancy_message =
      message.trim() + "\n\n" + colors.red("Compilation failed. See above.");
    var normal_message = message.trim();

    super(normal_message);
    this.message = fancy_message; //?? I don't understand this, I just found it here
  }
}
