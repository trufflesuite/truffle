module.exports = {
  command: "obtain",
  description: "Fetch and cache a specified compiler",
  help: {
    usage: "truffle obtain [--solc <version>]",
    options: [
      {
        option: "--solc <version>",
        description: `Download and cache a version of the solc compiler. (required)`
      }
    ],
    allowedGlobalOptions: ["quiet"]
  }
};
