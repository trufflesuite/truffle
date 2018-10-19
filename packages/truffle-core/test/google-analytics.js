const Config = require("truffle-config");
const userConfig = Config.getUserConfig();
const ua = require('universal-analytics');
const assert = require("chai").assert;
const sinon = require("sinon");
const googleAnalytics = require('../lib/services/google-analytics');
const inquirer = require("inquirer");
const configCommand = require('../lib/commands/config');
const Configstore = require('configstore');


describe("googleAnalytics", function() {
  beforeEach(() => {
    sinon.stub(inquirer, "prompt").returns({ then: () => 1 });
  });
  afterEach(() => {
    inquirer.prompt.restore();
  });
  describe("#setUserId", function(){
    it("sets a userId if one does not exist", function() {
      let checkConfigStub = sinon.stub(Configstore.prototype, "get").returns(false);
      let setConfigStub = sinon.stub(Configstore.prototype, "set");
      googleAnalytics.setUserId();
      sinon.assert.calledOnce(checkConfigStub);
      sinon.assert.calledOnce(setConfigStub); 
      checkConfigStub.restore();
      setConfigStub.restore();
    });
  });
  describe("#setAnalytics", function() {
    it("sets user-level analytics preferences when passed enableAnalytics option", function(){
      let setAnalyticsStub = sinon.stub(googleAnalytics, 'setAnalytics').resolves();
      configCommand.run({enableAnalytics: true});
      let stubArg = setAnalyticsStub.getCall(0).args[0];
      assert.equal(stubArg, true);
      setAnalyticsStub.restore();
    });
    it("sets user-level analytics preferences when passed disableAnalytics option", function(){
      let setAnalyticsStub = sinon.stub(googleAnalytics, 'setAnalytics').resolves();
      configCommand.run({disableAnalytics: true});
      let stubArg = setAnalyticsStub.getCall(0).args[0];
      assert.equal(stubArg, false);
      setAnalyticsStub.restore();
    });
    it("sets user-level configuration of enableAnalytics to true if passed true", function() {
      let setConfigStub = sinon.stub(Configstore.prototype, "set");
      googleAnalytics.setAnalytics(true);
      let stubArg = setConfigStub.getCall(0).args[0].enableAnalytics;
      assert.equal(stubArg, true);
      setConfigStub.restore();
    });
    it("sets user-level configuration of enableAnalytics to false if passed false", function() {
      let setConfigStub = sinon.stub(Configstore.prototype, "set");
      googleAnalytics.setAnalytics(false);
      let stubArg = setConfigStub.getCall(0).args[0].enableAnalytics;
      assert.equal(stubArg, false);
      setConfigStub.restore();
    });	
  });
  describe("#setUserConfigViaPrompt", function() {
    it("sets user-level configuration variables", function() {
      let setConfigStub = sinon.stub(googleAnalytics, "setUserConfigViaPrompt").resolves();
      configCommand.run({});
      sinon.assert.calledOnce(setConfigStub);
      setConfigStub.restore();
    });
  });
  describe("#checkIfAnalyticsEnabled", function() {
    it("checks the user-level config to see if analytics are enabled", function() {
      let checkConfigStub = sinon.stub(Configstore.prototype, "get");
      let checkIfAnalyticsEnabled = googleAnalytics.checkIfAnalyticsEnabled();
      sinon.assert.calledOnce(checkConfigStub);
      checkConfigStub.restore();
    });
  });
  describe("#setPersistentAnalyticsData", function() {
    it("checks that analytics are enabled before proceeding", function() {
      let checkAnalyticsStub = sinon.stub(googleAnalytics, "checkIfAnalyticsEnabled");
      googleAnalytics.setPersistentAnalyticsData();
      sinon.assert.calledOnce(checkAnalyticsStub);
      checkAnalyticsStub.restore();
    });
    it("sets and returns a visitor object for google analytics", function() {
      let visitor = googleAnalytics.setPersistentAnalyticsData();
      assert.exists(visitor);
      assert.isObject(visitor);
     }); 
  });
  describe("#sendAnalyticsEvent", function() {
    it("sends an event object to google analytics", function() {
      let sendStub = sinon.stub(ua.Visitor.prototype, "_enqueue");
      let sendingAnalyticsEvent = googleAnalytics.sendAnalyticsEvent({ec: "initialization", ea: "truffle unbox"});
      sinon.assert.calledOnce(sendStub);
      assert.equal(sendingAnalyticsEvent, true);
      sendStub.restore();
    });
  });
});
