const sinon = require("sinon");
const analytics = require("../lib/services/analytics/google");
const configCommand = require("../lib/commands/config");
const inquirer = require("inquirer");

describe("config", function() {
  describe("#run", function() {
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
    it("calls analytics.setAnalytics() when provided with enableAnalytics option", function() {
      configCommand.run({ enableAnalytics: true }, () => {});
      sinon.assert.calledOnce(analytics.setAnalytics);
    });
    it("calls analytics.setAnalytics() when provided with disableAnalytics option", function() {
      configCommand.run({ disableAnalytics: true }, () => {});
      sinon.assert.calledOnce(analytics.setAnalytics);
    });
    it("calls analytics.setuserConfigViaPrompt() if not provided with options", function() {
      configCommand.run({});
      sinon.assert.calledOnce(analytics.setUserConfigViaPrompt);
    });
  });
});
