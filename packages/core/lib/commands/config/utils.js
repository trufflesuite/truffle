const Config = require("@truffle/config");
const inquirer = require("inquirer");
const { v4: uuid } = require("uuid");

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

module.exports = {
  getUserConfig: function () {
    return Config.getUserConfig();
  },
  /**
   * set user-level unique id
   */
  setUserId: function () {
    if (!this.getUserConfig().get("uniqueId")) {
      const userId = uuid();
      this.getUserConfig().set({ uniqueId: userId });
    }
  },
  /**
   * get user-level options for analytics
   * @param {Object} userConfig
   * @returns {bool}
   */
  getAnalytics: function () {
    return this.getUserConfig().get("enableAnalytics");
  },
  /**
   * set user-level options for analytics
   * @param {bool} analyticsBool
   * @param {Object} userConfig
   */
  setAnalytics: function (analyticsBool) {
    if (analyticsBool === true) {
      this.setUserId();
      console.log("Analytics enabled");
      this.getUserConfig().set({
        enableAnalytics: true,
        analyticsSet: true,
        analyticsMessageDateTime: Date.now()
      });
    } else if (analyticsBool === false) {
      console.log("Analytics disabled");
      this.getUserConfig().set({
        enableAnalytics: false,
        analyticsSet: true,
        analyticsMessageDateTime: Date.now()
      });
    } else {
      const message =
        `Error setting config option.` +
        `\n> You must set the 'analytics' option to either 'true' ` +
        `or 'false'. \n> The value you provided was ${analyticsBool}.`;
      throw new Error(message);
    }
    return true;
  },
  /**
   * prompt user to determine values for user-level analytics config options
   * @param {Object} userConfig
   */
  setUserConfigViaPrompt: async function () {
    if (
      !this.getUserConfig().get("analyticsSet") &&
      process.stdin.isTTY === true
    ) {
      let answer = await inquirer.prompt(analyticsInquiry);
      if (answer.analyticsInquiry === analyticsInquiry[0].choices[0]) {
        this.setAnalytics(true);
      } else {
        this.setAnalytics(false);
      }
    } else if (
      this.getUserConfig().get("analyticsSet") &&
      this.getUserConfig().get("enableAnalytics") &&
      process.stdin.isTTY === true
    ) {
      let answer = await inquirer.prompt(analyticsDisable);
      if (answer.analyticsDisable) {
        this.setAnalytics(false);
      } else {
        this.setAnalytics(true);
      }
    } else if (
      this.getUserConfig().get("analyticsSet") &&
      !this.getUserConfig().get("enableAnalytics") &&
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
  }
};
