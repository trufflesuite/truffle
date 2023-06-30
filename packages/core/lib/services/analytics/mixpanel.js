const Config = require("@truffle/config");
const userConfig = Config.getUserConfig();
const version = require("../../version").info();
const TRUFFLE_TOKEN = version.bundled
  ? "1d07dcde31267402f4ad0740bcc0d797"
  : "2247a338c6bbd7e9a65bb3923e5b10b8";
const Mixpanel = require("mixpanel");

module.exports = {
  sendAnalyticsEvent: function (eventObject) {
    const { userId } = this.getUserId();
    const sendObject = {};
    const eventType = eventObject.command ? "command" : "error";
    if (eventObject.command) {
      sendObject["ec"] = eventObject["command"];
      sendObject["ea"] = JSON.stringify(eventObject["args"]);
      sendObject["el"] = eventObject["version"];
      sendObject["dp"] = "/" + eventObject["command"];
    } else {
      sendObject["ec"] = "Error";
      sendObject["ea"] = "nonzero exit code";
      sendObject["el"] =
        eventObject["version"] + " " + eventObject["exception"];
      sendObject["dp"] = "/error";
    }

    if (userId) {
      // eslint-disable-next-line no-unused-vars
      const mixpanel = Mixpanel.init(TRUFFLE_TOKEN, {
        keepAlive: false
      });
      mixpanel.track(eventType, eventObject);
    }

    return true;
  },

  getUserId: function () {
    return { userId: userConfig.get("uniqueId") };
  }
};
