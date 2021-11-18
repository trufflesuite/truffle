/* This command does starts an express derived server that invokes
 * `process.exit()` on SIGINT. As a result there is no need to invoke
 * truffle's own `process.exit()` which is triggered by invoking the `done`
 * callback.
 *
 * Todo: blacklist this command for REPLs
 */
module.exports = async function (argv) {
  const Config = require("@truffle/config");
  const { getTruffleDb } = require("@truffle/db-loader");
  const Db = getTruffleDb();
  if (Db === null) {
    throw new Error(
      "There was a problem importing Truffle Db. Ensure that you have " +
        "@truffle/db installed."
    );
  }
  const { serve } = Db;

  const config = Config.detect(argv);
  const port = (config.db && config.db.port) || 4444;
  const host = (config.db && config.db.host) || "127.0.0.1";

  const { url } = await serve(config.db).listen({ host, port });

  console.log(`🚀 Playground listening at ${url}`);
  console.log(`ℹ  Press Ctrl-C to exit`);

  await new Promise(() => {});
};
