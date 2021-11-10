const Reporter = require("./Reporter");

module.exports = {
  initialize: () => {
    this.logger = console;
  },
  handlers: {
    "migrate:start": [
      function ({ config, Migrate }) {
        console.log(1)
        Migrate.reporter = new Reporter(config.describeJson || false);
        Migrate.logger = this.logger;
      }
    ],
    "migrate:preAllMigrations": [
      async function ({ dryRun, Migrate, migrations }) {
        console.log(2)
        Migrate.reporter.setMigrator(Migrate);
        Migrate.reporter.listenMigrator();
        await Migrate.emitter.emit("preAllMigrations", {
          dryRun,
          migrations
        });
      }
    ],
    "migrate:postAllMigrations": [
      async function ({ dryRun, error, Migrate }) {
        console.log(3)
        await Migrate.emitter.emit("postAllMigrations", {
          dryRun,
          error
        });
      }
    ],
    "migrate:migration:run:start": [
      async function ({ migration, deployer, confirmations }) {
        console.log(4)
        if (migration.reporter) {
          migration.reporter.setMigration(migration);
          migration.reporter.setDeployer(deployer);
          migration.reporter.confirmations = confirmations || 0;
          migration.reporter.listen();
        }
      }
    ],
    "migrate:migration:deploy:transaction:start": [
      async function ({ data, migration }) {
        console.log(5)
        await migration.emitter.emit("startTransaction", data);
      }
    ],
    "migrate:migration:deploy:transaction:succeed": [
      async function ({ data, migration }) {
        console.log(6)
        await migration.emitter.emit("endTransaction", data);
      }
    ],
    "migrate:migration:deploy:migrate:succeed": [
      async function ({ eventArgs, migration }) {
        console.log(7)
        await migration.emitter.emit("postMigrate", eventArgs);
      }
    ],
    "migrate:migration:lastMigration:succeed": [
      async function ({ migration }) {
        console.log(8)
        await migration.emitter.clearListeners();
      }
    ],
    "migrate:migration:deploy:error": [
      async function ({ migration, payload }) {
        console.log(9)
        await migration.emitter.emit("error", payload);
      }
    ],
    "migrate:migration:run:preMigrations": [
      async function ({ migration, data }) {
        console.log(10)
        await migration.emitter.emit("preMigrate", data);
      }
    ]
  }
}
