const command = {
  command: "config",
  description: "set user-level configuration options",
  config: {
    usage: "truffle config --enable-analytics",
    options: [   
      {
        option: "--enable-analytics",
        description: "Enable Truffle to send usage data to Google Analytics",
      }, 
      {
        option: "--disable-analytics",
        description: "Disable Truffle's ability to send usage data to Google Analytics",
      }
    ]
  },
  builder: {},
  /**
  * run config commands to set user-level config settings
  * @param {Object} options
  * @param {Func} callback
  */
  run: function (options, done) {
    const googleAnalytics = require("../services/google-analytics");
    let setAnalytics;
    if(options.enableAnalytics) {
      setAnalytics = googleAnalytics.setAnalytics(true);
    } else if (options.disableAnalytics){
      setAnalytics = googleAnalytics.setAnalytics(false);
    } else {
      setAnalytics = googleAnalytics.setUserConfigViaPrompt();
      setAnalytics.then(() => done()).catch((err)=> err);
    }

    if(setAnalytics === true) { 
      return done();
    }
  }
}

module.exports = command;
