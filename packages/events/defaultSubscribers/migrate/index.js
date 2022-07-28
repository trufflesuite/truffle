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
        if (this.config.quiet) return;
        this.logger.log("\n> Exiting without migrating...\n\n");
      }
    ],
    "migrate:runMigrations:start": [
      async function ({ dryRun, migrations }) {
        if (this.config.quiet) return;
        const message = this.reporter.messages.steps("preAllMigrations", {
          migrations,
          dryRun
        });
        this.logger.log(message);
      }
    ],
    "migrate:runMigrations:finish": [
      async function ({ dryRun, error }) {
        if (this.config.quiet) return;
        const message = this.reporter.messages.steps("postAllMigrations", {
          dryRun,
          error
        });
        this.logger.log(message);
      }
    ],

    "migrate:settingCompletedMigrations:start": [
      async function (data) {
        if (this.config.quiet) return;

        await this.reporter.startTransaction(data);
      }
    ],
    "migrate:settingCompletedMigrations:succeed": [
      async function (data) {
        if (this.config.quiet) return;
        const message = await this.reporter.endTransaction(data);
        this.logger.log(message);
      }
    ],

    "migrate:migration:start": [
      async function (data) {
        if (this.config.quiet) return;
        const message = await this.reporter.preMigrate(data);
        this.logger.log(message);
      }
    ],
    "migrate:migration:succeed": [
      async function (eventArgs) {
        if (this.config.quiet) return;
        const message = await this.reporter.postMigrate(eventArgs);
        this.logger.log(message);
      }
    ],
    "migrate:migration:error": [
      async function (errorData) {
        if (this.config.quiet) return;
        const message = await this.reporter.error(errorData);
        this.logger.log(message);
      }
    ],

    "deployment:error": [
      async function (data) {
        const message = await this.reporter.error(data);
        if (!this.config.quiet) {
          this.logger.error(message);
        }
        return message; //we want to return the message no matter what for use in errors
      }
    ],
    "deployment:failed": [
      async function (data) {
        const message = await this.reporter.deployFailed(data);
        if (!this.config.quiet) {
          this.logger.log(message);
        }
        return message; //we want to return the message no matter what for use in errors
      }
    ],
    "deployment:start": [
      async function (data) {
        if (this.config.quiet) return;
        const message = await this.reporter.preDeploy(data);
        this.logger.log(message);
      }
    ],
    "deployment:succeed": [
      async function (data) {
        if (this.config.quiet) return;
        const message = await this.reporter.postDeploy(data);
        this.logger.log(message);
      }
    ],

    "deployment:block": [
      async function (data) {
        if (this.config.quiet) return;
        await this.reporter.block(data);
      }
    ],
    "deployment:confirmation": [
      async function (data) {
        if (this.config.quiet) return;
        const message = await this.reporter.confirmation(data);
        this.logger.log(message);
      }
    ],
    "deployment:txHash": [
      async function (data) {
        if (this.config.quiet) return;
        await this.reporter.txHash(data);
      }
    ],
    "deployment:linking": [
      async function (data) {
        if (this.config.quiet) return;
        const message = await this.reporter.linking(data);
        this.logger.log(message);
      }
    ],
    "deployment:newContract": [
      function ({ contract }) {
        if (this.config.quiet) return;
        this.logger.log("Creating new instance of " + contract.contractName);
      }
    ]
  }
};
