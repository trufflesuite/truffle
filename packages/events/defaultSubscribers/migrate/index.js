const Reporter = require("./Reporter");

module.exports = {
  initialize: () => {
    this.logger = console;
  },
  handlers: {
    "migrate:start": [
      function ({ config, Migrate }) {
        Migrate.reporter = new Reporter(config.describeJson || false);
        Migrate.logger = this.logger;
      }
    ],
    "migrate:preAllMigrations": [
      async function ({ options, Migrate, migrations }) {
        Migrate.reporter.setMigrator(Migrate);
        Migrate.reporter.listenMigrator();
        await Migrate.emitter.emit("preAllMigrations", {
          dryRun: options.dryRun,
          migrations
        });
      }
    ],
    "migrate:postAllMigrations": [
      async function ({ dryRun, error, Migrate }) {
        await Migrate.emitter.emit("postAllMigrations", {
          dryRun: options.dryRun,
          error
        });
      }
    ],
    "migrate:migration:run:start": [
      async function ({ Migration, deployer, confirmations }) {
        if (Migration.reporter) {
          Migration.reporter.setMigration(Migration);
          Migration.reporter.setDeployer(deployer);
          Migration.reporter.confirmations = confirmations || 0;
          Migration.reporter.listen();
        }
      }
    ],
    "migrate:migration:deploy:transaction:start": [
      async function ({ data, Migration }) {
        await Migration.emitter.emit("startTransaction", data);
      }
    ],
    "migrate:migration:deploy:transaction:succeed": [
      async function ({ data, Migration }) {
        await Migration.emitter.emit("endTransaction", data);
      }
    ],
    "migrate:migration:deploy:migrate:succeed": [
      async function ({ eventArgs, Migration }) {
        await Migration.emitter.emit("postMigrate", eventArgs);
      }
    ],
    "migrate:migration:lastMigration:succeed": [
      async function ({ Migration }) {
        await Migration.emitter.clearListeners();
      }
    ],
    "migrate:migration:deploy:error": [
      async function ({ Migration, payload }) {
        await Migration.emitter.emit("error", payload);
      }
    ],
    "migrate:migration:run:preMigrations": [
      async function ({ Migration, data }) {
        await Migration.emitter.emit("preMigrate", data);
      }
    ]
  }
}
