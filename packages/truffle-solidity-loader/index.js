/* External Module Dependencies */
var TruffleContractCompiler = require('truffle/lib/contracts')
var TruffleContractMigrator = require('truffle/lib/migrate')
var Pudding                 = require('ether-pudding')
var Web3                    = require('web3')
var temp                    = require('temp')

/* Native Node Imports */
var path                    = require('path')
var fs                      = require('fs')

// Convert a Query String into an object of key value pairs.
function parseQueryString(query) {
    var queryString = {};

    query.replace(
      new RegExp("([^?=&]+)(=([^&]*))?", "g"),
      function($0, $1, $2, $3) { queryString[$1] = $3; }
    );

    return queryString;
}

// Custom Logger
var Logger = {
  log: function(msg) {
    console.log("[TRUFFLE SOLIDITY] " + msg)
  }
}

module.exports = function (source) {
  this.cacheable && this.cacheable()

  var compilationFinished = this.async()
  var contractPath        = this.context
  var contractFilePath    = this.resourcePath
  var contractFileName    = path.basename(contractFilePath)
  var contractName        = contractFileName.charAt(0).toUpperCase() + contractFileName.slice(1, contractFileName.length-4)

  var buildOpts    = {}
  buildOpts.logger = Logger

  if (typeof this.query !== "undefined") {
    buildOpts = parseQueryString(this.query)
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

  temp.mkdir('webpack-truffle', function(err, dirPath){
    if(!err) {
      var compilerOpts = {};
      compilerOpts.contracts_directory       = contractPath
      compilerOpts.contracts_build_directory = dirPath
      compilerOpts.network                   = buildOpts.network
      compilerOpts.network_id                = buildOpts.network_id
      compilerOpts.logger                    = Logger

      var provisionOpts = {}
      provisionOpts.provider                  = new Web3.providers.HttpProvider(buildOpts.web3_rpc_uri)
      provisionOpts.contracts_build_directory = dirPath

      TruffleContractCompiler.compile( compilerOpts, function(err, contracts){
        var migrationOpts = {}
        migrationOpts.migrations_directory      = buildOpts.migrations_directory
        migrationOpts.contracts_build_directory = dirPath
        migrationOpts.provider                  = provisionOpts.provider
        migrationOpts.network                   = compilerOpts.network
        migrationOpts.network_id                = compilerOpts.network_id
        migrationOpts.logger                    = Logger

        TruffleContractMigrator.run( migrationOpts, function( err, result ) {
          if(err) {
            Logger.error(err);
            return compilationFinished(err, null);
          }

          fs.readFile( path.resolve(dirPath, contractFileName+'.js'), 'utf8', function(err, solJsFile) {
            if(err) {
              Logger.error(err);
              return compilationFinished(err, null);
            }

            compilationFinished(err, solJsFile)
          })
        })
      })
    }
  })

}
