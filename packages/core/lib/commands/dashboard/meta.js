module.exports = {
  command: "dashboard",
  description:
    "Start a Truffle Dashboard instance + DashboardProvider RPC endpoint",
  builder: {
    port: {
      describe: "Specify the port to start the dashboard and RPC endpoint on",
      type: "number"
    },
    host: {
      describe: "Specify the host to start the dashboard and RPC endpoint on",
      type: "string"
    },
    verbose: {
      describe: "Display debug logs for the dashboard server and message bus",
      type: "boolean"
    }
  },
  help: {
    usage: "truffle dashboard [--port <number>] [--host <string>] [--verbose]",
    options: [
      {
        option: "--port <number>",
        description: "Start the dashboard and RPC endpoint on a specific port."
      },
      {
        option: "--host <string>",
        description: "Start the dashboard and RPC endpoint on a specific host."
      },
      {
        option: "--verbose",
        description:
          "Log debug information from the Dashboard server and message bus."
      }
    ],
    allowedGlobalOptions: []
  }
};
