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

export class UnresolvedPathsError extends TruffleError {
  public message: string;
  constructor(unresolvedPaths: string[]) {
    const message = `\n${colors.bold(colors.red("Error"))}: Could not find ${
      unresolvedPaths.length === 1 ? "source" : "sources"
    } for specified ${
      unresolvedPaths.length === 1 ? "path" : "paths"
    }:\n - ${unresolvedPaths.join("\n - ")}\n${colors.bold(
      "Please check your input and try again."
    )}\n`;

    super(message);
  }
}
