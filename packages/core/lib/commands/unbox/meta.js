module.exports = {
  command: "unbox",
  description: "Download a Truffle Box, a pre-built Truffle project",
  builder: {},
  help: {
    usage: "truffle unbox [<box_name>] [destination] [--force]",
    options: [
      {
        option: "destination",
        description:
          "Path to the directory in which you would like " +
          "to unbox the project files. If destination is\n                  " +
          "  not provided, this defaults to the current directory."
      },
      {
        option: "<box_name>",
        description:
          "Name of the truffle box. If no box_name is specified, a default " +
          "truffle box will be downloaded."
      },
      {
        option: "--force",
        description:
          "Unbox project in the current directory regardless of its " +
          "state. Be careful, this\n                    will potentially overwrite files " +
          "that exist in the directory."
      }
    ],
    allowedGlobalOptions: ["quiet"]
  }
};
