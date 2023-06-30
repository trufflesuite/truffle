const assert = require("chai").assert;
const sinon = require("sinon");
const Mixpanel = require("mixpanel");
const mixpanelUtility = require("../../../../lib/services/analytics/mixpanel");

describe("mixpanel", function () {
  beforeEach(() => {
    sinon.stub(Mixpanel, "init").returns({
      track: sinon.spy()
    });
    sinon.stub(mixpanelUtility, "getUserId").returns("1234");
  });
  afterEach(() => {
    Mixpanel.init.restore();
    mixpanelUtility.getUserId();
  });

  describe("#sendAnalyticsEvent", function () {
    it("sends an event object to google analytics", function () {
      mixpanelUtility.sendAnalyticsEvent({
        ec: "initialization",
        ea: "truffle unbox"
      });
      assert(mixpanelUtility.getUserId.calledOnce);
      assert(Mixpanel.init.calledOnce);
    });
  });
});
