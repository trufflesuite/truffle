// import ua from 'universal-analytics'
const Config = require("truffle-config");
// const Command = require("./lib/command");
const userConfig = Config.getUserConfig();
const ua = require('universal-analytics');

const truffleAnalyticsId = "UA-83874933-6"

const googleAnalytics = {

  checkIfAnalyticsEnabled: function() {
    if(userConfig.get("enableAnalytics")) {
      return true;
    } else {
      return false;
    }
  },

  setPersistentAnalyticsData: function() {
    let visitor = false;
    if(this.checkIfAnalyticsEnabled() === true) {
      let visitor = ua(truffleAnalyticsId);
      let userId = userConfig.get("uniqueId");
      visitor.set("uid", userId);
      return visitor;
    }
  },

  sendAnalyticsEvent: function(eventObject) {
    let visitor = this.setPersistentAnalyticsData();
    if(visitor) {
      visitor.event({ec: category, ea: action, el: label}).send();
    }
  }
}

module.exports = googleAnalytics;
