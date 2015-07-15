repl = require "repl"
provision = require "./provision.coffee"

global.web3 = require "web3"
global.Pudding = require "ether-pudding"

class Repl

  @run: (config, done) ->

    provisioner = provision.asModule(config)
    provisioner.provision_contracts(global)

    try
      r = repl.start "truffle(#{config.environment})> "
      r.on "exit", () ->
        process.exit(1)
    catch e
      console.log e.stack
      process.exit(1)

module.exports = Repl 