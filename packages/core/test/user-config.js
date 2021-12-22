const sinon = require("sinon");
const Config = require("@truffle/config");
const Conf = require("conf");
const fs = require("fs");
const { expect } = require("chai");
const analytics = require("../lib/services/analytics/google");
const configCommand = require("../lib/commands/config");
const inquirer = require("inquirer");

describe("config", function () {
  describe("#run", function () {
    describe("analytics", function () {
      beforeEach(() => {
        sinon.stub(inquirer, "prompt").returns({ then: () => 1 });
        sinon.stub(analytics, "setAnalytics").resolves();
        sinon.stub(analytics, "setUserConfigViaPrompt").resolves();
      });
      afterEach(() => {
        inquirer.prompt.restore();
        analytics.setAnalytics.restore();
        analytics.setUserConfigViaPrompt.restore();
        sinon.restore();
      });
      it("calls analytics.setAnalytics() when provided with enableAnalytics option", function () {
        configCommand.run({ enableAnalytics: true }, () => {});
        sinon.assert.calledOnce(analytics.setAnalytics);
      });
      it("calls analytics.setAnalytics() when provided with disableAnalytics option", function () {
        configCommand.run({ disableAnalytics: true }, () => {});
        sinon.assert.calledOnce(analytics.setAnalytics);
      });
      it("calls analytics.setuserConfigViaPrompt() if not provided with options", function () {
        configCommand.run({ _: [] });
        sinon.assert.calledOnce(analytics.setUserConfigViaPrompt);
      });
    });
    describe("db", function () {
      const TEST_CONFIG_DIR = "./delme";
      beforeEach(() => {
        sinon
          .stub(Config, "getUserConfig")
          .returns(new Conf({ cwd: TEST_CONFIG_DIR }));
      });

      afterEach(() => {
        Config.getUserConfig.restore();
        fs.rmdirSync(TEST_CONFIG_DIR, { recursive: true });
      });

      it("sets saveDbToProjectRoot when no config is set", () => {
        const noConfig = Config.getUserConfig();
        expect(typeof noConfig).to.equal("object");
        expect(noConfig.hasOwnProperty("db")).to.equal(false);

        configCommand.run({ _: ["set", "saveDbToProjectRoot", "true"] });

        const config = Config.getUserConfig().get();

        expect(config.db.hasOwnProperty("saveDbToProjectRoot")).to.equal(true);
        expect(config.db.saveDbToProjectRoot).to.equal(true);
      });
      it("respects other config settings", () => {
        configCommand.run({ _: ["set", "saveDbToProjectRoot", "true"] });

        Config.getUserConfig().set("rofl", "copters");
        Config.getUserConfig().set("db.enabled", true);

        const config = Config.getUserConfig().get();

        expect(config.rofl).to.equal("copters");
        expect(config.db.hasOwnProperty("enabled")).to.equal(true);
        expect(config.db.enabled).to.equal(true);
        expect(config.db.hasOwnProperty("saveDbToProjectRoot")).to.equal(true);
        expect(config.db.saveDbToProjectRoot).to.equal(true);
      });
      it('coerces truthy values from user-given string params, correctly interprets "false"', () => {
        configCommand.run({
          _: ["set", "saveDbToProjectRoot", "truthy"]
        });
        let config = Config.getUserConfig().get();

        expect(config.db.saveDbToProjectRoot).to.equal(true);

        configCommand.run({
          _: ["set", "saveDbToProjectRoot", "false"]
        });
        config = Config.getUserConfig().get();
        expect(config.db.saveDbToProjectRoot).to.equal(false);
      });
    });
  });
});
