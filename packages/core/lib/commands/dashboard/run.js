module.exports = async function (options) {
  const { detectConfigOrDefault } = require("../../utils/utils");
  const { DashboardServer } = require("@truffle/dashboard");
  const address = require("address");

  const config = detectConfigOrDefault(options);

  const port = options.port || config.dashboard.port;
  const host = options.host || config.dashboard.host;
  const autoOpen = options.autoOpen ?? config.dashboard.autoOpen;
  const verbose = options.verbose || config.dashboard.verbose;
  const rpc = true;

  const dashboardServerOptions = { port, host, autoOpen, verbose, rpc };
  const dashboardServer = new DashboardServer(dashboardServerOptions);
  await dashboardServer.start();

  if (host === "0.0.0.0") {
    // Regex taken from react-scripts to check that the address is a private IP, otherwise we discard it
    // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
    let lanAddress =
      /^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(address.ip())
        ? address.ip()
        : undefined;

    console.log(`Truffle Dashboard running at http://localhost:${port}`);
    lanAddress &&
      console.log(`                             http://${lanAddress}:${port}`);

    console.log(
      `DashboardProvider RPC endpoint running at http://localhost:${port}/rpc`
    );
    lanAddress &&
      console.log(
        `                                          http://${lanAddress}:${port}/rpc`
      );
  } else {
    console.log(`Truffle Dashboard running at http://${host}:${port}`);
    console.log(
      `DashboardProvider RPC endpoint running at http://${host}:${port}/rpc`
    );
  }

  // ensure that `await`-ing this method never resolves. (we want to keep
  // the console open until it exits on its own)
  return new Promise(() => {});
};
