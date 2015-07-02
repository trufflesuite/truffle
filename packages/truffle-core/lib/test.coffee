Mocha = require "mocha"
chai = require "chai"
dir = require "node-dir"
web3 = require "web3"

Contracts = require "./contracts"

Pudding = require "ether-pudding"
loadconf = require "./loadconf"

# Use custom assertions.
global.assert = chai.assert
chai.use(require "./assertions")

class Test
  @setup: (config, callback) ->

    # Variables that are passed to each contract which are
    # populated by the global before() hook.
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
        
        before "redeploy before each contract", (done) ->
          @timeout(BEFORE_TIMEOUT)

          # Redeploy contracts before each contract.
          Contracts.deploy config, (err) ->
            if err?
              done(err)
              return

            # Prepare the objects that get passed to the tests.
            loadconf config.environments.current.contracts_filename, (err, json) ->
              for name, contract of json
                global[name] = Pudding.whisk(contract.abi)
                global[name].deployed_address = contract.address if contract.address?

              done()

        tests(accounts)

    # Compile all the contracts and get the available accounts.
    # We only need to do this one, and can get it outside of 
    # mocha.
    Contracts.compile_all config, (err) ->
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

        for file in files.sort()
          mocha.addFile(file)

        mocha.run (failures) ->
          callback(null, failures)


module.exports = Test