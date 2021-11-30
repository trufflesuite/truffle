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
  },
  run: async function (options) {
    const Config = require("@truffle/config");
    const { DashboardServer } = require("@truffle/dashboard");
    const address = require("address");

    const config = Config.detect(options);

    // Passed CLI options take precedence over config options, falling back on the default values
    const port = options.port || (config.dashboard && config.dashboard.port) || 24012;
    const host = options.host || (config.dashboard && config.dashboard.host) || "0.0.0.0";
    const verbose = options.verbose || (config.dashboard && config.dashboard.verbose) || false;
    const rpc = true;

    const dashboardServerOptions = { port, host, verbose, rpc };
    const dashboardServer = new DashboardServer(dashboardServerOptions);
    await dashboardServer.start();

    if (host === "0.0.0.0") {
      // Regex taken from react-scripts to check that the address is a private IP, otherwise we discard it
      // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
      let lanAddress = /^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(address.ip())
        ? address.ip()
        : undefined;

      console.log(
        `Truffle Dashboard running at http://localhost:${port}`
      );
      lanAddress && console.log(
        `                             http://${lanAddress}:${port}`
      );

      console.log(
        `DashboardProvider RPC endpoint running at http://localhost:${port}/rpc`
      );
      lanAddress && console.log(
        `                                          http://${lanAddress}:${port}/rpc`
      );
    } else {
      console.log(
        `Truffle Dashboard running at http://${host}:${port}`
      );
      console.log(
        `DashboardProvider RPC endpoint running at http://${host}:${port}/rpc`
      );
    }

    // ensure that `await`-ing this method never resolves. (we want to keep
    // the console open until it exits on its own)
    return new Promise(() => {});
  }
};
