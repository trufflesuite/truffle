const assert = require("chai").assert;
const command = require("../../../lib/commands/migrate");
let options, config, result;

describe("migrate", () => {
  describe("determineDryRunSettings(config, options)", () => {
    beforeEach(() => {
      config = {
        networks: {
          currentlyUsedNetwork: {
            network_id: "*"
          }
        },
        network: "currentlyUsedNetwork"
      };
      options = {};
    });

    describe("when the user specifies production in the config", () => {
      beforeEach(() => {
        config.production = true;
      });

      it("returns dryRunAndMigrations as false when user specifies skipDryRun", () => {
        options.skipDryRun = true;
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunAndMigrations === false);
      });
      it("returns dryRunAndMigrations as true when user doesn't specify skipDryRun", () => {
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunAndMigrations === true);
      });
    });

    describe("when there is not config data for the currently used network", () => {
      beforeEach(() => {
        config = {
          networks: {},
          network: "currentlyUsedNetwork"
        };
      });

      it("returns dryRunOnly as true if options specify it", () => {
        options.dryRun = true;
        options.skipDryRun = true; // dryRun option overrides skipDryRun
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunOnly === true);
      });
      it("returns dryRunOnly as false if option is not true", () => {
        options.dryRun = undefined;
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunOnly === false);
      });
      it("returns dryRunAndMigrations as falsy when set to true", () => {
        options.skipDryRun = true;
        result = command.determineDryRunSettings(config, options);
        assert.isNotOk(result.dryRunAndMigrations);
      });
      it("returns dryRunAndMigrations as true when option not set and production set", () => {
        config.production = true;
        options.dryRun = undefined;
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunOnly === false);
      });
    });

    describe("when the user is using a known network", () => {
      beforeEach(() => {
        config.network_id = 4;
      });

      it("returns dryRunAndMigrations as false when user specifies skipDryRun", () => {
        options.skipDryRun = true;
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunAndMigrations === false);
      });
      it("returns dryRunAndMigrations as true when user doesn't specify skipDryRun", () => {
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunAndMigrations === true);
      });
    });

    describe("dry run only cases", () => {
      it("returns dryRunOnly as false when nothing is specified", () => {
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunOnly === false);
      });
      it("returns dryRunOnly as true when specified as a flag", () => {
        options = { dryRun: true };
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunOnly === true);
      });
      it("returns dryRunOnly as true when specified in the config", () => {
        config.networks.currentlyUsedNetwork.dryRun = true;
        result = command.determineDryRunSettings(config, options);
        assert(result.dryRunOnly === true);
      });
    });
  });
});
