web3 = require "web3"
async = require "async"
fs = require "fs"
mkdirp = require "mkdirp"
child_process = require "child_process"
path = require "path"

class Contracts

  @resolve: (root, callback) ->
    imported = {}

    import_path = (file) -> 
      code = fs.readFileSync(file, "utf-8")
      
      # Remove comments
      code = code.replace /(\/\/.*(\n|$))/g, ""
      code = code.replace /(\/\*(.|\n)*?\*\/)/g, ""
      code = code.replace "*/", "" # Edge case.

      # Perform imports.
      code = code.replace /import ('|")[^'"]+('|");/g, (match) ->
        match = match.replace /'/g, '"'
        import_name = match.split('"')[1]
        import_path = path.dirname(file) + "/" + import_name + ".sol"

        # Don't import the same thing twice if there are two of the same dependency.
        return "" if imported[import_name] == true

        if !fs.existsSync(import_path)
          throw "Could not find source for '#{import_name} from #{file}'. Expected: #{import_path}"

        imported[import_name] = true

        return import_path(import_path) + "\n\n"
      return code

    try 
      callback null, import_path(root)
    catch e
      callback e

  @compile_all: (config, callback) ->
    async.mapSeries Object.keys(config.contracts.classes), (key, finished) =>
      contract = config.contracts.classes[key]
      source = contract.source
      display_name = source.substring(source.lastIndexOf("/") + 1)
      console.log "Compiling #{display_name}..." unless config.grunt.option("quiet-deploy")
      @resolve source, (err, code) ->
        if err?
          callback(err)
          return
        
        web3.eth.compile.solidity code, (err, result) ->
          if err?
            finished(err, result)
            return
        
          contract["binary"] = result[key].code
          contract["abi"] = result[key].info.abiDefinition
          finished(null, contract)
    , callback

  @deploy: (config, done_deploying) ->
    coinbase = null

    async.series [
      (c) -> 
        web3.eth.getCoinbase (error, result) ->
          coinbase = result
          c(error, result)
      (c) ->
        # Put them on the network
        async.mapSeries config.app.deploy, (key, callback) ->
          contract = config.contracts.classes[key]

          if !contract
            callback("Could not find contract '#{key}' for deployment. Check app.json.")
            return


          display_name = contract.source.substring(contract.source.lastIndexOf("/") + 1)
          console.log "Sending #{display_name} to the network..." unless config.grunt.option("quiet-deploy")

          web3.eth.sendTransaction
            from: coinbase
            gas: 3141592
            gasPrice: 1000000000000 # I have no idea why this is so high, but geth updates made me do it.
            data: contract.binary
          , (err, result) ->
            if err?
              callback(err, result)
            else
              contract.address = result
              callback(err, contract)

        , (err, results) ->
          if err?
            console.log "ERROR sending contract:"
            c(err)
          else
            c()
      (c) ->
        # Verifying deployment of contracts
        console.log "Verifying deployment..." unless config.grunt.option("quiet-deploy")

        attempts = 0
        max_attempts = 120

        interval = null
        verify = () ->
          last = config.app.deploy[config.app.deploy.length - 1]
          contract = config.contracts.classes[last]

          web3.eth.getCode contract.address, (err, response) ->
            # Ignore errors.
            return if err?

            if response != "" and response != "0x"
              clearInterval(interval)
              c()
              return

            attempts += 1

            if attempts >= max_attempts
              clearInterval(interval)
              c("Contracts not deployed after #{attempts} seconds!")

        interval = setInterval verify, 1000

    ], (err) ->
      if err?
        done_deploying(err)
        return
      
      mkdirp config.environments.current.directory, (err, result) ->
        if err?
          done_deploying(err)
          return 

        display_directory = "." + config.environments.current.contracts_filename.replace(config.working_dir, "")
        console.log "Writing contracts to #{display_directory}"
        fs.writeFileSync(config.environments.current.contracts_filename, JSON.stringify(config.contracts.classes, null, 2), {flag: "w+"})

        done_deploying()


module.exports = Contracts