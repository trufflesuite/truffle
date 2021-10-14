module.exports = {
  command: "dashboard",
  description:
    "Start a Truffle Dashboard instance + BrowserProvider RPC endpoint",
  builder: {
    port: {
      describe: "Specify the port to start the dashboard and RPC endpoint on",
      type: "number",
      default: 5000
    },
    host: {
      describe: "Specify the host to start the dashboard and RPC endpoint on",
      type: "string",
      default: "localhost"
    },
    verbose: {
      describe: "Display debug logs for the dashboard server and message bus",
      type: "boolean",
      default: false
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
  },
  run: async function (options) {
    const { DashboardServer } = require("@truffle/dashboard");

    const dashboardServerOptions = {
      port: options.port,
      host: options.host,
      rpc: true,
      verbose: options.verbose
    };

    const dashboardServer = new DashboardServer(dashboardServerOptions);
    await dashboardServer.start();

    console.log(
      `Truffle Dashboard running at http://${options.host}:${options.port}`
    );
    console.log(
      `BrowserProvider RPC endpoint running at http://${options.host}:${options.port}/rpc`
    );

    // ensure that `await`-ing this method never resolves. (we want to keep
    // the console open until it exits on its own)
    return new Promise(() => {});
  }
};
