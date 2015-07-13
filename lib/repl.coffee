CoffeeScript = require "coffee-script"
fs = require "fs"
m = require "module"
vm = require "vm"
path = require "path"
repl = require "repl"

global.web3 = require "web3"
global.Pudding = require "ether-pudding"

class Repl

  @run: (config, done) ->

    for name, contract of config.contracts.classes
      global[name] = Pudding.whisk(contract.abi)

      if contract.address?
        global[name].deployed_address = contract.address

    try
      r = repl.start "[truffle]-> "
    catch e
      console.log e.stack
      process.exit(1)

module.exports = Repl 