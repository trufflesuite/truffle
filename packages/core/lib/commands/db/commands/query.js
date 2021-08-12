const command = {
  command: "query",
  description: "Query @truffle/db",
  builder: {},
  help: {
    usage: "truffle db query <query>",
    options: [],
    allowedGlobalOptions: []
  },

  /* This command does starts an express derived server that invokes
   * `process.exit()` on SIGINT. As a result there is no need to invoke
   * truffle's own `process.exit()` which is triggered by invoking the `done`
   * callback.
   *
   * Todo: blacklist this command for REPLs
   */
  run: async function (argv) {
    const Config = require("@truffle/config");
    const { getTruffleDb } = require("@truffle/db-loader");
    const Db = getTruffleDb();
    if (Db === null) {
      throw new Error(
        "There was a problem importing Truffle Db. Ensure that you have " +
        "@truffle/db installed."
      );
    }
    const { connect } = Db;

    const config = Config.detect(argv);
    const [_, query] = config._;

    if (!query) {
      throw new Error(
        "Query not provided. Please run `truffle db query <query>`"
      );
    }

    const db = connect(config.db);

    const result = await db.execute(query, {});
    console.log(JSON.stringify(result, null, 2));
  }
};

module.exports = command;
