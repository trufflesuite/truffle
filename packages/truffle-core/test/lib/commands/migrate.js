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
