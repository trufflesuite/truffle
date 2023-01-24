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
    },
    url: {
      describe: "Connect to a specified provider given via URL",
      type: "string"
    }
  },
  help: {
    usage:
      "truffle exec <script.js> [--compile] [--network <network>|--url <provider_url>]",
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
      },
      {
        option: "--url",
        description:
          "Connects to a specified provider given via URL, ignoring networks in config."
      },
      {
        option: "--network",
        description:
          "The network to connect to, as specified in the Truffle config."
      }
    ],
    allowedGlobalOptions: ["config"]
  }
};
