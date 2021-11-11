const Reporter = require("./Reporter");
const Messages = require("./Messages");

module.exports = {
  initialize: () => {
    this.logger = console;
  },
  handlers: {
    "migrate:start": [
      function ({ config }) {
        this.reporter = new Reporter({
          dryRun: config.dryRun,
          logger: this.logger,
          describeJson: config.describeJson || false,
        });
      }
    ],
    "migrate:preAllMigrations": [
      async function ({ dryRun, migrations }) {
        const message = this.reporter.messages.steps("preAllMigrations", {
          migrations,
          dryRun
        });
        this.logger.log(message);
      }
    ],
    "migrate:postAllMigrations": [
      async function ({ dryRun, error }) {
        const message = this.reporter.messages.steps("postAllMigrations", {
          dryRun,
          error
        });
        this.logger.log(message);
      }
    ],

    "migrate:migration:run:start": [
      async function ({ migration, deployer, confirmations }) {
        if (migration) {
          this.reporter.setDeployer(deployer);
          this.reporter.confirmations = confirmations || 0;
          this.reporter.listen();
        }
      }
    ],
    "migrate:migration:deploy:transaction:start": [
      async function ({ data }) {
        await this.reporter.startTransaction(data);
      }
    ],
    "migrate:migration:deploy:transaction:succeed": [
      async function ({ data }) {
        await this.reporter.endTransaction(data);
      }
    ],
    "migrate:migration:deploy:migrate:succeed": [
      async function ({ eventArgs }) {
        this.reporter.postMigrate(eventArgs);
      }
    ],

    "migrate:migration:deploy:error": [
      async function ({ payload }) {
        this.reporter.error(payload);
      }
    ],
    "migrate:migration:run:preMigrations": [
      async function ({ data }) {
        this.reporter.preMigrate(data);
      }
    ]
  }
}
