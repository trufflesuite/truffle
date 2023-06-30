const assert = require("chai").assert;
const MemoryStream = require("memorystream");
const command = require("../../../lib/commands/config");
const path = require("path");
const fse = require("fs-extra");
const Config = require("@truffle/config");
const { createTestProject } = require("../../helpers");
const sinon = require("sinon");
const analyticsUtils = require("../../../lib/commands/config/utils");
const inquirer = require("inquirer");
let mockUserConfig;

describe("config", function () {
  let config;
  let output = "";
  let memStream;

  beforeEach(function () {
    config = createTestProject(path.join(__dirname, "../../sources/metacoin"));
    config.logger = { log: val => val && memStream.write(val) };
    memStream = new MemoryStream();
    memStream.on("data", data => {
      output += data.toString();
    });
  });

  afterEach("Clear MemoryStream", () => {
    memStream.end("");
    output = "";
  });

  it("retrieves the default migrations directory", async function () {
    await command.run({
      working_directory: config.working_directory,
      _: ["get", "migrations_directory"],
      logger: config.logger
    });
    const expected = path.join(config.working_directory, "./migrations");
    assert.equal(output, expected);
  });

  it("retrieves an adjusted migrations directory", async function () {
    const configFile = Config.search({
      working_directory: config.working_directory
    });
    fse.writeFileSync(
      configFile,
      "module.exports = { migrations_directory: './a-different-dir' };",
      { encoding: "utf8" }
    );

    await command.run({
      working_directory: config.working_directory,
      _: ["get", "migrations_directory"],
      logger: config.logger
    });
    const expected = path.join(config.working_directory, "./a-different-dir");
    assert.equal(output, expected);
  });

  describe("config", function () {
    describe("#run", function () {
      beforeEach(() => {
        sinon.stub(inquirer, "prompt").returns({ then: () => 1 });
        sinon.stub(analyticsUtils, "setAnalytics").resolves();
        sinon.stub(analyticsUtils, "setUserConfigViaPrompt").resolves();
      });
      afterEach(() => {
        inquirer.prompt.restore();
        analyticsUtils.setAnalytics.restore();
        analyticsUtils.setUserConfigViaPrompt.restore();
        sinon.restore();
      });
      it("calls analyticsUtils.setAnalytics() when provided with enableAnalytics option", function () {
        command.run({ enableAnalytics: true, _: [] }, () => {});
        sinon.assert.calledOnce(analyticsUtils.setAnalytics);
      });
      it("calls analyticsUtils.setAnalytics() when provided with disableAnalytics option", function () {
        command.run({ disableAnalytics: true, _: [] }, () => {});
        sinon.assert.calledOnce(analyticsUtils.setAnalytics);
      });
      it("calls analyticsUtils.setuserConfigViaPrompt() if not provided with options", function () {
        command.run({ _: [] });
        sinon.assert.calledOnce(analyticsUtils.setUserConfigViaPrompt);
      });
    });
  });

  describe("analyticsUtils", function () {
    describe("#setUserId", function () {
      beforeEach(() => {
        mockUserConfig = {
          get: () => false,
          set: sinon.spy()
        };
        sinon.stub(inquirer, "prompt").returns({ then: () => 1 });
        sinon.stub(analyticsUtils, "getUserConfig").returns(mockUserConfig);
        sinon.stub(analyticsUtils, "setUserConfigViaPrompt").resolves();
      });
      afterEach(() => {
        inquirer.prompt.restore();
        analyticsUtils.getUserConfig.restore();
        analyticsUtils.setUserConfigViaPrompt.restore();
      });

      it("sets a userId if one does not exist", function () {
        analyticsUtils.setUserId();
        assert(mockUserConfig.set.calledOnce);
      });
    });

    describe("#setAnalytics", function () {
      beforeEach(function () {
        mockUserConfig = {
          get: sinon.spy(),
          set: sinon.spy()
        };
        sinon.stub(analyticsUtils, "getUserConfig").returns(mockUserConfig);
      });
      afterEach(function () {
        analyticsUtils.getUserConfig.restore();
      });

      it("sets user-level analytics preferences when passed enableAnalytics option", async function () {
        sinon.stub(analyticsUtils, "setAnalytics").resolves();
        await command.run({ enableAnalytics: true }, () => {});
        let stubArg = analyticsUtils.setAnalytics.getCall(0).args[0];
        assert.equal(stubArg, true);
        analyticsUtils.setAnalytics.restore();
      });
      it("sets user-level analytics preferences when passed disableAnalytics option", async function () {
        sinon.stub(analyticsUtils, "setAnalytics").resolves();
        await command.run({ disableAnalytics: true }, () => {});
        let stubArg = analyticsUtils.setAnalytics.getCall(0).args[0];
        assert.equal(stubArg, false);
        analyticsUtils.setAnalytics.restore();
      });
      it("sets user-level configuration of enableAnalytics to true if passed true", function () {
        analyticsUtils.setAnalytics(true);
        assert.equal(
          mockUserConfig.set.getCall(1).args[0].enableAnalytics,
          true
        );
      });
      it("sets user-level configuration of enableAnalytics to false if passed false", function () {
        analyticsUtils.setAnalytics(false);
        assert.equal(
          mockUserConfig.set.getCall(0).args[0].enableAnalytics,
          false
        );
      });
    });
  });
});
