var utils = require("./lib/utils");
var tmp = require("tmp");
var path = require("path");

const Config = require("truffle-config");
const ua = require('universal-analytics');
const userConfig = Config.getUserConfig();

var Box = {
  unbox: function(url, destination, options) {
    options = options || {};
    options.logger = options.logger || { log: () => {} };

    const downloadBoxOptions = {
      force: options.force,
    }

    return Promise.resolve()
      .then(()=> {
        if(userConfig.get("enableAnalytics")) {
          let visitor = ua("UA-83874933-6");
          let userId = userConfig.get("uniqueId");
          visitor.set("uid", userId);
          visitor.event({ec:"Usage", ea: "Initialized truffle", el: "New Project"}).send();
        }
      })  
      .then(() => {
        options.logger.log("Downloading...");
        return utils.downloadBox(url, destination, downloadBoxOptions)
      })
      .then(() => {
        options.logger.log("Unpacking...");
        return utils.unpackBox(destination);
      })
      .then((boxConfig) => {
        options.logger.log("Setting up...");
        return utils.setupBox(boxConfig, destination)
      })
      .then((boxConfig) => boxConfig);
  },

  sandbox: function(name, callback) {
    var self = this;
    if (typeof name === "function") {
      callback = name;
      name = "default";
    }

    tmp.dir(function(err, dir, cleanupCallback) {
      if (err) {
        return callback(err);
      }

      self.unbox("https://github.com/trufflesuite/truffle-init-" + name, dir)
        .then(function() {
          var config = Config.load(path.join(dir, "truffle.js"), {});
          callback(null, config);
        })
        .catch(callback);
    });
  }
};

module.exports = Box;
