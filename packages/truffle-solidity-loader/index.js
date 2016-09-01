/* External Module Dependencies */
var TruffleContractCompiler = require('truffle/lib/contracts')
var TruffleContractMigrator = require('truffle/lib/migrate')
var Pudding                 = require('ether-pudding')
var Web3                    = require('web3')
var temp                    = require('temp')

/* Internal Module Dependencies */
var Logger                  = require('./lib/logger_decorator')
var BuildOptionNormalizer   = require('./lib/build_option_normalizer')

/* Native Node Imports */
var path                    = require('path')
var fs                      = require('fs')


module.exports = function (source) {
  this.cacheable && this.cacheable()

  var compilationFinished = this.async()
  var contractPath        = this.context
  var contractFilePath    = this.resourcePath
  var contractFileName    = path.basename(contractFilePath)
  var contractName        = contractFileName.charAt(0).toUpperCase() + contractFileName.slice(1, contractFileName.length-4)

  var buildOpts    = {}
  buildOpts.logger = Logger
  buildOpts        = BuildOptionNormalizer.normalize(buildOpts, this.query)

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
