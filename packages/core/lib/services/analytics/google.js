/**
 * @module googleAnalytics;
 * @requires module:truffle-config
 * @requires module:universal-analytics
 * @requires module:uuid
 * @requires module:inquirer
 * @requires module:../version
 */

const Config = require("truffle-config");
const userConfig = Config.getUserConfig();
const ua = require("universal-analytics");
const uuid = require("uuid/v4");

const inquirer = require("inquirer");

const version = require("../../version").info();

//set truffleAnalyticsId depending on whether version is bundled
const truffleAnalyticsId = version.bundle ? "UA-83874933-6" : "UA-83874933-7";

const analyticsInquiry = [
  {
    type: "list",
    name: "analyticsInquiry",
    message:
      "Would you like to enable analytics for your Truffle projects? Doing so will allow us to make sure Truffle is working as expected and help us address any bugs more efficiently.",
    choices: ["Yes, enable analytics", "No, do not enable analytics"]
  }
];
const analyticsDisable = [
  {
    type: "confirm",
    name: "analyticsDisable",
    message: "Analytics are currently enabled. Would you like to disable them?",
    default: false
  }
];
const analyticsEnable = [
  {
    type: "confirm",
    name: "analyticsEnable",
    message: "Analytics are currently disabled. Would you like to enable them?",
    default: false
  }
];

const googleAnalytics = {
  /**
   * set user-level unique id
   */
  setUserId: function() {
    if (!userConfig.get("uniqueId")) {
      let userId = uuid();
      userConfig.set({ uniqueId: userId });
    }
  },
  /**
   * set user-level options for analytics
   * @param {bool} analyticsBool
   * @param {Object} userConfig
   */
  setAnalytics: function(analyticsBool) {
    if (analyticsBool === true) {
      this.setUserId();
      userConfig.set({
        enableAnalytics: true,
        analyticsSet: true,
        analyticsMessageDateTime: Date.now()
      });
    } else {
      userConfig.set({
        enableAnalytics: false,
        analyticsSet: true,
        analyticsMessageDateTime: Date.now()
      });
    }
    return true;
  },
  /**
   * prompt user to determine values for user-level analytics config options
   * @param {Object} userConfig
   */
  setUserConfigViaPrompt: async function() {
    if (!userConfig.get("analyticsSet") && process.stdin.isTTY === true) {
      let answer = await inquirer.prompt(analyticsInquiry);
      if (answer.analyticsInquiry === analyticsInquiry[0].choices[0]) {
        this.setAnalytics(true);
      } else {
        this.setAnalytics(false);
      }
    } else if (
      userConfig.get("analyticsSet") &&
      userConfig.get("enableAnalytics") &&
      process.stdin.isTTY === true
    ) {
      let answer = await inquirer.prompt(analyticsDisable);
      if (answer.analyticsDisable) {
        this.setAnalytics(false);
      } else {
        this.setAnalytics(true);
      }
    } else if (
      userConfig.get("analyticsSet") &&
      !userConfig.get("enableAnalytics") &&
      process.stdin.isTTY === true
    ) {
      let answer = await inquirer.prompt(analyticsEnable);
      if (answer.analyticsEnable) {
        this.setAnalytics(true);
      } else {
        this.setAnalytics(false);
      }
    }
    return true;
  },
  /**
   * check user-level config to see if user has enabled analytics
   * @returns {bool}
   */
  checkIfAnalyticsEnabled: function() {
    if (userConfig.get("enableAnalytics")) {
      return true;
    } else {
      return false;
    }
  },

  /**
   * set data that will be the same in future calls
   * @returns {Object} visitor
   */
  setPersistentAnalyticsData: function() {
    if (this.checkIfAnalyticsEnabled() === true) {
      let userId = userConfig.get("uniqueId");
      let visitor = ua(truffleAnalyticsId, { cid: userId });
      return visitor;
    }
  },

  /**
   * send event to Google Analytics
   * @param {Object}
   */
  // eslint-disable-next-line no-unused-vars
  sendAnalyticsEvent: function(eventObject, callback) {
    let visitor = this.setPersistentAnalyticsData();
    let sendObject = {};
    if (eventObject["command"]) {
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

    if (visitor) {
      // eslint-disable-next-line no-unused-vars
      visitor.event(sendObject, function(err) {});
    }

    return true;
  }
};

module.exports = googleAnalytics;
