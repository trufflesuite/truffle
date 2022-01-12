module.exports = {
  command: "exec",
  description: "Execute a JS module within this Truffle environment",
  builder: {
    file: {
      type: "string"
    },
    c: {
      type: "boolean",
      default: false
    },
    compile: {
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle exec <script.js> [--compile]",
    options: [
      {
        option: "<script.js>",
        description:
          "JavaScript file to be executed. Can include path information if the script" +
          " does not exist in the current\n                    directory. (required)"
      },
      {
        option: "--compile",
        description: "Compile contracts before executing the script."
      }
    ],
    allowedGlobalOptions: ["network", "config"]
  }
};
