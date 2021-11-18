const Reporter = require("./Reporter");

module.exports = {
  initialization: function (config) {
    this.logger = config.logger || console;
    this.config = config;
    this.reporter = new Reporter({
      subscriber: this
    });
  },
  handlers: {
    "migrate:dryRun:notAccepted": [
      async function () {
        this.logger.log("\n> Exiting without migrating...\n\n");
      }
    ],
    "migrate:runMigrations:start": [
      async function ({ dryRun, migrations }) {
        const message = this.reporter.messages.steps("preAllMigrations", {
          migrations,
          dryRun
        });
        this.logger.log(message);
      }
    ],
    "migrate:runMigrations:finish": [
      async function ({ dryRun, error }) {
        const message = this.reporter.messages.steps("postAllMigrations", {
          dryRun,
          error
        });
        this.logger.log(message);
      }
    ],

    "migrate:settingCompletedMigrations:start": [
      async function (data) {
        this.logger.log();
        await this.reporter.startTransaction(data);
      }
    ],
    "migrate:settingCompletedMigrations:succeed": [
      async function (data) {
        const message = await this.reporter.endTransaction(data);
        this.logger.log(message);
      }
    ],

    "migrate:migration:deploy:error": [
      async function (errorData) {
        const message = await this.reporter.error(errorData);
        this.logger.log(message);
      }
    ],
    "migrate:migration:run:preMigrations": [
      async function (data) {
        const message = await this.reporter.preMigrate(data);
        this.logger.log(message);
      }
    ],
    "migrate:migration:deploy:migrate:succeed": [
      async function (eventArgs) {
        const message = await this.reporter.postMigrate(eventArgs);
        this.logger.log(message);
      }
    ],

    "deployment:block": [
      async function (data) {
        const message = await this.reporter.block(data);
        this.logger.log(message);
      }
    ],
    "deployment:confirmation": [
      async function (data) {
        const message = await this.reporter.confirmation(data);
        this.logger.log(message);
      }
    ],
    "deployment:txHash": [
      async function (data) {
        const message = await this.reporter.txHash(data);
        this.logger.log(message);
      }
    ],
    "deployment:postDeploy": [
      async function (data) {
        const message = await this.reporter.postDeploy(data);
        this.logger.log(message);
      }
    ],
    "deployment:deployFailed": [
      async function (data) {
        const message = await this.reporter.deployFailed(data);
        this.logger.log(message);
        return message;
      }
    ],
    "deployment:error": [
      async function (data) {
        const message = await this.reporter.error(data);
        this.logger.error(message);
        return message;
      }
    ],
    "deployment:preDeploy": [
      async function (data) {
        const message = await this.reporter.preDeploy(data);
        this.logger.log(message);
      }
    ],
    "deployment:linking": [
      async function (data) {
        const message = await this.reporter.linking(data);
        this.logger.log(message);
      }
    ],
    "deployment:newContract": [
      function ({ contract }) {
        this.logger.log("Creating new instance of " + contract.contractName);
      }
    ]
  }
};
