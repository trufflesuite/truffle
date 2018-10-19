const assert = require("chai").assert;
const sinon = require("sinon");
const googleAnalytics = require('../lib/services/google-analytics');
const configCommand = require('../lib/commands/config');


describe("config", function() {
	describe("#run", function() {
		it("calls googleAnalytics.setAnalytics() when provided with enableAnalytics option", function() {
			let setAnalyticsStub = sinon.stub(googleAnalytics, 'setAnalytics').resolves();
			configCommand.run({enableAnalytics: true});
			sinon.assert.calledOnce(setAnalyticsStub);
			setAnalyticsStub.restore();
		});
		it("calls googleAnalytics.setAnalytics() when provided with disableAnalytics option", function() {
			let setAnalyticsStub = sinon.stub(googleAnalytics, 'setAnalytics').resolves();
			configCommand.run({disableAnalytics: true});
			sinon.assert.calledOnce(setAnalyticsStub);
			setAnalyticsStub.restore();
		});
		it("calls googleAnalytics.setuserConfigViaPrompt() if not provided with options", function() {
			let setConfigStub = sinon.stub(googleAnalytics, "setUserConfigViaPrompt").resolves();
			configCommand.run({});
			sinon.assert.calledOnce(setConfigStub);
			setConfigStub.restore();
		});
	});
}); 