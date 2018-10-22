const assert = require("chai").assert;
const sinon = require("sinon");
const googleAnalytics = require('../lib/services/google-analytics');
const configCommand = require('../lib/commands/config');
const inquirer = require("inquirer");

describe("config", function() {
  describe("#run", function() {
  	beforeEach(() => {
    	sinon.stub(inquirer, "prompt").returns({ then: () => 1 });
    	sinon.stub(googleAnalytics, 'setAnalytics').resolves();
    	sinon.stub(googleAnalytics, "setUserConfigViaPrompt").resolves();
	  });
	  afterEach(() => {
	    inquirer.prompt.restore();
	    googleAnalytics.setAnalytics.restore();
	    googleAnalytics.setUserConfigViaPrompt.restore();
	    sinon.restore();
	  });
    it("calls googleAnalytics.setAnalytics() when provided with enableAnalytics option", function() {
      configCommand.run({enableAnalytics: true}, ()=> {});
      sinon.assert.calledOnce(googleAnalytics.setAnalytics);
    });
    it("calls googleAnalytics.setAnalytics() when provided with disableAnalytics option", function() {
      configCommand.run({disableAnalytics: true}, ()=> {});
      sinon.assert.calledOnce(googleAnalytics.setAnalytics);
    });
    it("calls googleAnalytics.setuserConfigViaPrompt() if not provided with options", function() {
      configCommand.run({});
      sinon.assert.calledOnce(googleAnalytics.setUserConfigViaPrompt);
    });
  });
}); 
