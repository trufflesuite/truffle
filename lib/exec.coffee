CoffeeScript = require "coffee-script"
fs = require "fs"
m = require "module"
vm = require "vm"
path = require "path"

global.web3 = require "web3"
global.Pudding = require "ether-pudding"

class Exec

  # NOTE: Executed files are expected to call process.exit()!
  # Otherwise they'll stay open.
  @file: (config, file, done) ->
    process.on 'uncaughtException', (err) ->
      console.log "asdfasdfasdfa"
      console.log err

    for name, contract of config.contracts.classes
      global[name] = Pudding.whisk(contract.abi)

      if contract.address?
        global[name].deployed_address = contract.address

    process.chdir(config.working_dir)

    module.filename = file
    dir = path.dirname(fs.realpathSync(file))

    for module_path in m._nodeModulePaths(dir)
      module.paths.unshift(module_path) if module.paths.indexOf(module_path) < 0

    try
      CoffeeScript.run(fs.readFileSync(file, "utf8"), {filename: file})
    catch e
      console.log e.stack
      process.exit(1)

module.exports = Exec