fs = require "fs"
CoffeeScript = require "coffee-script"
path = require "path"

class Provision
  @asString: (config) ->

    if config.app.resolved.provider? 
      provider = fs.readFileSync(path.join(config.working_dir, config.app.resolved.provider), "utf8")
    else
      provider = ""

    provider = provider.replace(/"/g, '\\"')

    # Double stringify. We'll parse in the inserter code.
    contracts = JSON.stringify(JSON.stringify(config.contracts.classes, null, 2))
    inserter_code = fs.readFileSync(config.frontend.contract_inserter_filename, "utf8")
    inserter_code = inserter_code.replace("{{CONTRACTS}}", contracts)
    inserter_code = inserter_code.replace("{{HOST}}", config.app.resolved.rpc.host || "")
    inserter_code = inserter_code.replace("{{PORT}}", config.app.resolved.rpc.port || "")
    inserter_code = inserter_code.replace("{{PROVIDER}}", provider)
    inserter_code = CoffeeScript.compile(inserter_code)
    
    return inserter_code

  @asModule: (config) ->
    code = Provision.asString(config)
    Module = module.constructor
    m = new Module()
    m._compile(code)
    return m.exports

module.exports = Provision
  
