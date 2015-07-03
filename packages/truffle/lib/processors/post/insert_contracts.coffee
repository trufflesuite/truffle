fs = require "fs"
CoffeeScript = require "coffee-script"

module.exports = (contents, file, config, process, callback) ->
  try
    binary_found = false
    for name, contract of config.contracts.classes
      if contract.binary? 
        binary_found = true
        break

    if !binary_found and Object.keys(config.contracts.classes).length > 0
      console.log "Warning: No compiled contracts found. Did you deploy your contracts before building?"

    contracts = JSON.stringify(config.contracts.classes, null, 2)
    inserter_code = fs.readFileSync(config.frontend.contract_inserter_filename, "utf8").replace("{{CONTRACTS}}", contracts)
    inserter_code = CoffeeScript.compile(inserter_code)

    callback(null, inserter_code + "\n\n" + contents)
  catch e
    callback(e)