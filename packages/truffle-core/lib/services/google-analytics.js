const Config = require("truffle-config");
const userConfig = Config.getUserConfig();
const ua = require('universal-analytics');

const truffleAnalyticsId = "UA-83874933-6"
  
const googleAnalytics = {
  /**
  * check user-level config to see if user has enabled analytics
  * @returns {bool}
  */
  checkIfAnalyticsEnabled: function() {
    if(userConfig.get("enableAnalytics")) {
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
    let visitor = false;
    if(this.checkIfAnalyticsEnabled() === true) {
      let visitor = ua(truffleAnalyticsId);
      let userId = userConfig.get("uniqueId");
      visitor.set("uid", userId);
      return visitor;
    }
  },

  /**
  * send event to Google Analytics
  * @param {Object}
  */
  sendAnalyticsEvent: function(eventObject, callback) {
    let visitor = this.setPersistentAnalyticsData();
    //console.logs added for testing, remove before merge!!!
    if(visitor) {
      console.log('sending event' + JSON.stringify(eventObject));
      visitor.event(eventObject, function(err) {
        console.log(err);
        console.log('hello it worked!');
      }).send();
    }
  }
}

module.exports = googleAnalytics;
