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
          confirmations: config.confirmations || 0
        });
      }
    ],
    "migrate:dryRun:notAccepted": [
      async function () {
        this.logger.log("\n> Exiting without migrating...\n\n");
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
        return await this.reporter.postMigrate(eventArgs);
      }
    ],

    "migrate:migration:deploy:error": [
      async function ({ errorData }) {
        return await this.reporter.error(errorData);
      }
    ],
    "migrate:migration:run:preMigrations": [
      async function ({ data }) {
        return await this.reporter.preMigrate(data);
      }
    ],

    "migrate:deployment:block": [
      async function ({ data }) {
        return await this.reporter.block(data);
      }
    ],
    "migrate:deployment:confirmation": [
      async function ({ data }) {
        return await this.reporter.confirmation(data);
      }
    ],
    "migrate:deployment:txHash": [
      async function ({ data }) {
        return await this.reporter.txHash(data);
      }
    ],
    "migrate:deployment:postDeploy": [
      async function ({ data }) {
        return await this.reporter.postDeploy(data);
      }
    ],
    "migrate:deployment:deployFailed": [
      async function ({ data }) {
        return await this.reporter.deployFailed(data);
      }
    ],
    "migrate:deployment:error": [
      async function ({ data }) {
        return await this.reporter.error(data);
      }
    ],
    "migrate:deployment:preDeploy": [
      async function ({ data }) {
        return await this.reporter.preDeploy(data);
      }
    ],
    "migrate:deployment:linking": [
      async function ({ data }) {
        return await this.reporter.linking(data);
      }
    ]
  }
}
