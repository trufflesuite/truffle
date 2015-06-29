Mocha = require "mocha"
chai = require "chai"
dir = require "node-dir"
web3 = require "web3"

Contracts = require "./contracts"

Pudding = require "ether-pudding"
loadconf = require "./loadconf"

# Use custom assertions.
global.assert = chai.assert
#chai.use(require "./assertions")

class Test
  @setup: (config, callback) ->

    # Variables that are passed to each contract which are
    # populated by the global before() hook.
    contracts = {}
    addresses = {}
    abi = {}
    accounts = []

    BEFORE_TIMEOUT = 120000
    TEST_TIMEOUT = 300000
    
    # # "global" before hook that mocha uses to run
    # # before all other tests start running.
    # before "deploy contracts", (done) ->
    #   @timeout(BEFORE_TIMEOUT)

    global.contract = (name, tests) ->
      describe "Contract: #{name}", () ->
        @timeout(TEST_TIMEOUT)
        tests(addresses, accounts)

    Contracts.compile_all config, (err) ->
      if err? 
        callback(err)
        return

      Contracts.deploy config, (err) ->
        if err?
          callback(err)
          return

        web3.eth.getAccounts (error, accs) ->
          for account in accs
            accounts.push account

          Pudding.defaults {
            from: accounts[0]
            gas: 3141592
          }

          # Prepare the objects that get passed to the tests.
          loadconf config.environments.current.contracts_filename, (err, json) ->
            for name, contract of json
              addresses[name] = contract.address
              global[name] = Pudding.whisk(contract.abi)
            
            callback()

  
  @run: (config, callback) ->
    config.expect(config.tests.directory, "tests directory")

    @setup config, (err) ->
      if err?
        callback err
        return

      dir.files config.tests.directory, (err, files) ->
        if err?
          callback err
          return
        
        mocha = new Mocha({
          useColors: true
        })

        for file in files
          mocha.addFile(file)

        mocha.run (failures) ->
          callback(null, failures)


module.exports = Test