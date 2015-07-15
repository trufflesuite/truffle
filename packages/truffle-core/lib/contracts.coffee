web3 = require "web3"
async = require "async"
fs = require "fs"
mkdirp = require "mkdirp"
child_process = require "child_process"
path = require "path"

class Contracts

  @resolve: (root, callback) ->
    imported = {}

    import_file = (file) -> 
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

        return import_file(import_path) + "\n\n"
      return code

    try 
      callback null, import_file(root)
    catch e
      callback e

  # Support the breaking change that made sendTransaction return a transaction
  # hash instead of an address hash when committing a new contract.
  @get_contract_address: (config, address_or_tx, callback) ->
    if address_or_tx.length == 42
      callback(null, address_or_tx)
      return

    attempts = 0
    max_attempts = 120

    interval = null
    verify = () ->
      # Call the method via the provider directly as it hasn't yet been 
      # implemented in web3.
      config.provider.sendAsync
        jsonrpc: "2.0"
        method: "eth_getTransactionReceipt"
        params:[address_or_tx]
        id: new Date().getTime()
      , (err, result) ->
        if err?
          callback err
          return

        result = result.result

        # Gotta love inconsistent responses.
        if result? and result != "" and result != "0x"
          clearInterval(interval)
          callback(null, result.contractAddress)
          return

        attempts += 1

        if attempts >= max_attempts
          clearInterval(interval)
          callback(new Error("Contracts not deployed after #{attempts} seconds!"))

    interval = setInterval verify, 1000

  @check_for_valid_compiler: (file, callback) ->
    if path.extname(file) == ".sol"
      compiler_name = "solidity"

    if !compiler_name? 
      callback(new Error("Compiler for #{path.extname(file)} not yet supported by Truffle. We hope to support every compiler eventually. Express your interested by filing a bug report on Github."))
      return

    web3.eth.getCompilers (err, result) ->
      if err?
        callback(err)
        return

      result = result.map (x) ->
        x.toLowerCase()

      if result.indexOf(compiler_name) < 0
        callback(new Error("Your RPC client doesn't support compiling files with the #{path.extname(file)} extension. Please make sure you have the relevant compilers installed and your RPC client is configured correctly. The compilers supported by your RPC client are: [#{result.join(', ')}]"))
        return 

      callback()

  @compile_all: (config, callback) ->
    async.mapSeries Object.keys(config.contracts.classes), (key, finished) =>
      contract = config.contracts.classes[key]
      source = contract.source

      display_name = source.substring(source.lastIndexOf("/") + 1)
      console.log "Compiling #{display_name}..." unless config.grunt.option("quiet-deploy")

      @check_for_valid_compiler source, (err) =>
        if err? 
          finished(err)
          return

        @resolve source, (err, code) ->
          if err?
            finished(err)
            return
          
          web3.eth.compile.solidity code, (err, result) ->
            if err?
              finished(err, result)
              return
          
            contract["binary"] = result[key].code
            contract["abi"] = result[key].info.abiDefinition
            finished(null, contract)
    , (err, result) ->
      if err?
        console.log ""
        console.log err.message
        console.log ""
        console.log "Hint: Some clients don't send helpful error messages through the RPC. See client logs for more details."
        err = new Error("Compilation failed. See above.")
      callback(err)

  @compile: (config, callback) ->
    async.series [
      (c) ->
        config.test_connection (error, coinbase) ->
          if error?
            callback(new Error("Could not connect to your Ethereum client. Truffle uses your Ethereum client to compile contracts. Please ensure your client is running and can compile the all contracts within the contracts directory."))
          else
            c()
      (c) =>
        @compile_all(config, callback)
    ]

  @deploy: (config, compile=true, done_deploying) ->
    coinbase = null

    async.series [
      (c) -> 
        web3.eth.getCoinbase (error, result) ->
          coinbase = result
          c(error, result)
      (c) =>
        if compile == true
          @compile_all(config, c)
        else
          c()
      (c) =>
        # Put them on the network
        async.mapSeries config.app.resolved.deploy, (key, callback) =>
          contract = config.contracts.classes[key]

          if !contract?
            callback(new Error("Could not find contract '#{key}' for deployment. Check app.json."))
            return

          display_name = contract.source.substring(contract.source.lastIndexOf("/") + 1)
          console.log "Sending #{display_name} to the network..." unless config.grunt.option("quiet-deploy")

          web3.eth.sendTransaction
            from: coinbase
            gas: 3141592
            gasPrice: 1000000000000 # I have no idea why this is so high, but geth updates made me do it.
            data: contract.binary
          , (err, result) =>
            if err?
              callback(err, result)
              return
            
            @get_contract_address config, result, (err, address) ->
              contract.address = address
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
          last = config.app.resolved.deploy[config.app.resolved.deploy.length - 1]
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
              c(new Error("Contracts not deployed after #{attempts} seconds!"))

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
        console.log "Writing contracts to #{display_directory}" unless config.grunt.option("quiet-deploy")
        fs.writeFileSync(config.environments.current.contracts_filename, JSON.stringify(config.contracts.classes, null, 2), {flag: "w+"})

        done_deploying()


module.exports = Contracts