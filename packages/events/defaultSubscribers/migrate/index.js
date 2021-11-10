const Reporter = require("./Reporter");
const Messages = require("./Messages");

module.exports = {
  initialize: () => {
    this.logger = console;
  },
  handlers: {
    "migrate:start": [
      function ({ config, Migrate }) {
        console.log(1)
        this.reporter = new Reporter({
          logger: this.logger,
          describeJson: config.describeJson || false,
        });
      }
    ],
    "migrate:preAllMigrations": [
      async function ({ dryRun, migrations, Migrate }) {
        console.log(2)

        const message = this.reporter.messages.steps("preAllMigrations", {
          migrations,
          dryRun
        });
        this.logger.log(message);
      }
    ],
    "migrate:postAllMigrations": [
      async function ({ dryRun, error, Migrate }) {
        console.log(3)
        const message = this.reporter.messages.steps("postAllMigrations", {
          dryRun,
          error
        });
        this.logger.log(message);
      }
    ],

    "migrate:migration:run:start": [
      async function ({ migration, deployer, confirmations }) {
        console.log(4)
        if (migration) {
          this.reporter.setMigration(migration);
          this.reporter.setDeployer(deployer);
          this.reporter.confirmations = confirmations || 0;
          this.reporter.listen();
        }
      }
    ],
    "migrate:migration:deploy:transaction:start": [
      async function ({ data, migration }) {
        console.log(5)
        await this.reporter.startTransaction(data);
      }
    ],
    "migrate:migration:deploy:transaction:succeed": [
      async function ({ data, migration }) {
        console.log(6)
        await this.reporter.endTransaction(data);
      }
    ],
    "migrate:migration:deploy:migrate:succeed": [
      async function ({ eventArgs, migration }) {
        console.log(7)
        this.reporter.postMigrate(eventArgs);
      }
    ],

    "migrate:migration:deploy:error": [
      async function ({ migration, payload }) {
        console.log(9)
        this.reporter.error(payload);
      }
    ],
    "migrate:migration:run:preMigrations": [
      async function ({ migration, data }) {
        console.log(10)
        this.reporter.preMigrate(data);
      }
    ]
  }
}
