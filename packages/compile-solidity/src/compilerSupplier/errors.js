class NoVersionError extends Error {
  constructor(input) {
    const message = `Could not find a compiler version matching ${input}. ` +
      `Please ensure you are specifying a valid version, constraint or ` +
      `build in the truffle config. Run \`truffle compile --list\` to ` +
      `see available versions.`;
    super(message);
  }
}

class NoRequestError extends Error {
  constructor(input, error) {
    const message =
      `Failed to complete request to: ${input}. Are you connected to ` +
      `the internet?\n\n` +
      error;
    super(message);
  }
}

module.exports = {
  NoVersionError,
  NoRequestError
};
