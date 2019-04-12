const Config = require("truffle-config");
const ua = require("universal-analytics");
const assert = require("chai").assert;
const sinon = require("sinon");
const analytics = require("../../../../lib/services/analytics/google");
const inquirer = require("inquirer");
const configCommand = require("../../../../lib/commands/config");
const Configstore = require("configstore");

describe("analytics", function() {
  beforeEach(() => {
    sinon.stub(inquirer, "prompt").returns({ then: () => 1 });
    sinon.stub(Config, "getUserConfig").returns(true);
    sinon.stub(Configstore.prototype, "get").returns(false);
    sinon.stub(Configstore.prototype, "set");
    sinon.stub(analytics, "setUserConfigViaPrompt").resolves();
    sinon.stub(ua.Visitor.prototype, "_enqueue");
  });
  afterEach(() => {
    inquirer.prompt.restore();
    Config.getUserConfig.restore();
    Configstore.prototype.get.restore();
    Configstore.prototype.set.restore();
    analytics.setUserConfigViaPrompt.restore();
    ua.Visitor.prototype._enqueue.restore();
    sinon.restore();
  });
  describe("#setUserId", function() {
    it("sets a userId if one does not exist", function() {
      analytics.setUserId();
      sinon.assert.calledOnce(Configstore.prototype.get);
      sinon.assert.calledOnce(Configstore.prototype.set);
    });
  });
  describe("#setAnalytics", function() {
    it("sets user-level analytics preferences when passed enableAnalytics option", function() {
      let setAnalyticsStub = sinon.stub(analytics, "setAnalytics").resolves();
      configCommand.run({ enableAnalytics: true }, () => {});
      let stubArg = setAnalyticsStub.getCall(0).args[0];
      assert.equal(stubArg, true);
      setAnalyticsStub.restore();
    });
    it("sets user-level analytics preferences when passed disableAnalytics option", function() {
      let setAnalyticsStub = sinon.stub(analytics, "setAnalytics").resolves();
      configCommand.run({ disableAnalytics: true }, () => {});
      let stubArg = setAnalyticsStub.getCall(0).args[0];
      assert.equal(stubArg, false);
      setAnalyticsStub.restore();
    });
    it("sets user-level configuration of enableAnalytics to true if passed true", function() {
      analytics.setAnalytics(true);
      sinon.assert.calledTwice(Configstore.prototype.set);
      let stubArg = Configstore.prototype.set.getCall(1).args[0]
        .enableAnalytics;
      assert.equal(stubArg, true);
    });
    it("sets user-level configuration of enableAnalytics to false if passed false", function() {
      analytics.setAnalytics(false);
      sinon.assert.calledOnce(Configstore.prototype.set);
      let stubArg = Configstore.prototype.set.getCall(0).args[0]
        .enableAnalytics;
      assert.equal(stubArg, false);
    });
  });
  describe("#setUserConfigViaPrompt", function() {
    it("sets user-level configuration variables", function() {
      configCommand.run({}, () => {});
      sinon.assert.calledOnce(analytics.setUserConfigViaPrompt);
    });
  });
  describe("#checkIfAnalyticsEnabled", function() {
    it("checks the user-level config to see if analytics are enabled", function() {
      analytics.checkIfAnalyticsEnabled();
      sinon.assert.calledOnce(Configstore.prototype.get);
    });
  });
  describe("#setPersistentAnalyticsData", function() {
    it("checks that analytics are enabled before proceeding", function() {
      let checkAnalyticsStub = sinon
        .stub(analytics, "checkIfAnalyticsEnabled")
        .returns(true);
      analytics.setPersistentAnalyticsData();
      sinon.assert.calledOnce(checkAnalyticsStub);
      checkAnalyticsStub.restore();
    });
    it("sets and returns a visitor object for google analytics", function() {
      let checkAnalyticsStub = sinon
        .stub(analytics, "checkIfAnalyticsEnabled")
        .returns(true);
      let visitor = analytics.setPersistentAnalyticsData();
      assert.exists(visitor);
      assert.isObject(visitor);
      checkAnalyticsStub.restore();
    });
  });
  describe("#sendAnalyticsEvent", function() {
    it("sends an event object to google analytics", function() {
      sinon.stub(analytics, "checkIfAnalyticsEnabled").returns(true);
      analytics.sendAnalyticsEvent({
        ec: "initialization",
        ea: "truffle unbox"
      });
      sinon.assert.calledOnce(ua.Visitor.prototype._enqueue);
    });
  });
});
