export class NoVersionError extends Error {
  constructor(input: string) {
    const message =
      `Could not find a compiler version matching ${input}. ` +
      `Please ensure you are specifying a valid version, constraint or ` +
      `build in the truffle config. Run \`truffle compile --list\` to ` +
      `see available versions.`;
    super(message);
  }
}

export class CompilerFetchingError extends Error {
  constructor(compilerRoots: string[]) {
    const message =
      `Failed to fetch the Solidity compiler from the following locations: ` +
      `${compilerRoots}. Are you connected to the internet?\n\n`;
    super(message);
  }
}

export class FailedRequestError extends Error {
  constructor(input: string, error: Error) {
    const message =
      `Failed to complete request to: ${input}. Are you connected to ` +
      `the internet?\n\n` +
      error;
    super(message);
  }
}
