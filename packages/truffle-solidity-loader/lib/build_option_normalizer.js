var merge                   = require('lodash.merge')
var Logger                  = require('./logger_decorator')

var QueryStringParser       = require('./query_string_parser')
var TruffleConfigLocator    = require('./truffle_config_locator')
var TruffleConfig           = require('truffle/lib/config.js');

var BuildOptionNormalizer = {
  normalize: function(buildOpts, query) {
    var truffleConfig = TruffleConfigLocator.find()

    if(truffleConfig) {
      var config = TruffleConfig.load(truffleConfig)
      config = merge(buildOpts, config)
    }

    if (query !== "undefined") {
      var config = QueryStringParser.parse(query)
      merge(buildOpts, config)
    }

    if(!buildOpts.network) {
      buildOpts.network = "default"
      Logger.log("Setting network to 'default' for compilation and contract provisioning")
    }

    if(!buildOpts.network_id) {
      buildOpts.network_id = "default"
      Logger.log("Setting network_id to 'default' for compilation and contract provisioning")
    }

    if(!buildOpts.migrations_directory) {
      throw new Error("You must specify the location of the Truffle migrations directory in the loader query string. (migrations_directory)")
    }

    return buildOpts
  }
}

module.exports = BuildOptionNormalizer
