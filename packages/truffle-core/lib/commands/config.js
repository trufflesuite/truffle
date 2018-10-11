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
  run: function (options, callback) {
    const nanoid = require('nanoid');
    const Configstore = require('configstore');
    const userConfig = new Configstore('truffle', {}, { globalConfigPath: true });
    const inquirer = require('inquirer');

    const analyticsInquiry = [
      {
        type : "list",
        name : "analyticsInquiry",
        message : "Would you like to enable analytics for your Truffle projects? Doing so will allow us to make sure Truffle is working as expected and address any bugs more efficiently.",
        choices: ["Yes, enable analytics",
         "No, do not enable analytics"],
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
        type: 'confirm',
        name: 'analyticsEnable',
        message: "Analytics are currently disabled. Would you like to enable them?",
        default: false
      }
    ];

    /**
    * set user-level options for analytics
    * @param {bool} analyticsBool
    * @param {Object} userConfig
    */
    function setAnalytics (analyticsBool) {
      if(analyticsBool === true) {
        if(!userConfig.get('uniqueId')) {
          let userId =  nanoid();
          userConfig.set({ 'uniqueId': userId });
        } 
        userConfig.set({ 'enableAnalytics': true });
        userConfig.set({ 'analyticsSet': true });
        userConfig.set({ 'analyticsMessageDateTime': Date.now() });
      } else {
        userConfig.set({ 'enableAnalytics': false });
        userConfig.set({ 'analyticsSet': true });
        userConfig.set({ 'analyticsMessageDateTime': Date.now() });
      }
    };
    /**
    * prompt user to determine values for user-level analytics config options
    * @param {Object} userConfig
    */
    async function setUserConfigViaPrompt () {
      if(!userConfig.get('analyticsSet') && process.stdin.isTTY === true) {
        await inquirer.prompt(analyticsInquiry)
        .then(async answer => {
          if(answer.analyticsInquiry === analyticsInquiry[0].choices[0]) {
            setAnalytics(true);
          } else {
            setAnalytics(false);
          }
        });
      } else if (userConfig.get('analyticsSet') && userConfig.get('enableAnalytics')) {
        await inquirer.prompt(analyticsDisable)
        .then(async answer => {
          if(answer.analyticsDisable) {
           setAnalytics(false); 
          } else {
            setAnalytics(true);
          }
        });
      } else if(userConfig.get('analyticsSet') && !userConfig.get('enableAnalytics')) {
        await inquirer.prompt(analyticsEnable)
        .then(async answer => {
          if(answer.analyticsEnable) {
            setAnalytics(true);
          } else {
            setAnalytics(false);
          }
        });
      }
    };

    if(options.enableAnalytics) {
      setAnalytics(true);
    } else if (options.disableAnalytics){
      setAnalytics(false);
    } else {
      setUserConfigViaPrompt();
    }
  }
}

module.exports = command;
