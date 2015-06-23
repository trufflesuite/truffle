factory = (Promise, web3) ->
  class Pudding
    @whisk: (abi, defaults) ->
      contract = web3.eth.contract(abi)
      contract = Pudding.inject_transaction_defaults contract, defaults
      contract = Pudding.synchronize_contract(contract)
      if Promise?
        contract = Pudding.promisify_contract(contract)
      return contract

    @inject_transaction_defaults: (contract_class, defaults) ->
      old_at = contract_class.at
      contract_class.at = (address) ->
        instance = old_at.call(contract_class, address)

        for abi_object in contract_class.abi
          fn_name = abi_object.name
          fn = instance[fn_name]

          continue if !fn?

          # First inject defaults for the whole function
          instance[fn_name] = Pudding.inject_transaction_defaults_into_function(instance, fn, defaults)

          # Copy over properties of that function to the new one.
          for key, value of fn
            instance[fn_name][key] = value

          # Then inject defaults into sendTransaction and call functions
          instance[fn_name].sendTransaction = Pudding.inject_transaction_defaults_into_function(instance, fn.sendTransaction, defaults)
          instance[fn_name].call = Pudding.inject_transaction_defaults_into_function(instance, fn.call, defaults)

        return instance
      return contract_class

    @inject_transaction_defaults_into_function: (instance, fn, defaults) ->
      return () ->
        args = Array.prototype.slice.call(arguments)
        callback = args.pop()

        # Would be nice to have lodash, but no need to add that
        # dependency here.
        options = {}
        for key, value of defaults
          options[key] = value

        if typeof args[args.length - 1] == "object"
          old_options = args.pop()
          
          for key, value of old_options
            options[key] = value

        args.push options, callback

        fn.apply(instance, args)

    @promisify_contract: (contract_class) ->
      old_at = contract_class.at
      contract_class.at = (address) ->
        instance = old_at.call(contract_class, address)
        # Promisify .call() and .sendTransaction() for functions.
        for key, fn of instance
          continue if typeof fn != "object" and typeof fn != "function"

          for k, v of fn
            continue if typeof fn != "object" and typeof fn != "function"
            fn[k] = Promise.promisify(v, instance)

          instance[key] = Promise.promisify(fn, instance)
        # Promisify functions themselves, which translate to sendTransaction()
        return instance
      return contract_class

    # Assumes the last argument is always a callback
    @synchronize_function: (instance, fn) ->
      interval = null
      max_attempts = 240
      attempts = 0
      return () ->
        args = Array.prototype.slice.call(arguments)
        callback = args.pop()
        
        new_callback = (error, response) ->
          if error?
            callback(error, response)
            return

          tx = response
          interval = null

          make_attempt = () ->
            #console.log "Interval check #{attempts}..."
            web3.eth.getTransaction tx, (e, tx_info) ->
              # If there's an error ignore it.
              return if e?

              if tx_info.blockHash?
                clearInterval(interval)
                callback(null, tx)

              if attempts >= max_attempts
                clearInterval(interval)
                callback("Transaction #{tx} wasn't processed in #{attempts} attempts!", tx)

              attempts += 1

          interval = setInterval make_attempt, 1000
          make_attempt()

        args.push new_callback

        fn.apply(instance, args)


    # All functions that call transaction functions should wait for the transaction
    # to be processed before calling their callback. This only applies to abi 
    # functions, and not to fn.sendTransaction() and fn.call(). You can use 
    # fn.sendTransaction() to make a non-synchronous call, for instance, if you
    # want to queue up many transactions before waiting for the last one to 
    # be processed. 
    @synchronize_contract: (contract_class) ->
      old_at = contract_class.at
      contract_class.at = (address) ->
        instance = old_at.call(contract_class, address)

        for abi_object in contract_class.abi
          fn_name = abi_object.name
          fn = instance[fn_name]

          continue if !fn?

          # Synchronize only the default function. Leave .sendTransaction() and .call()
          # to be unsynchronized, in the event multiple transactions need to be made before waiting.
          instance[fn_name] = Pudding.synchronize_function(instance, fn)

          # Copy over properties of that function to the new one.
          for key, value of fn
            instance[fn_name][key] = value

        return instance
      return contract_class

  Pudding

if module? and module.exports?
  module.exports = factory(require("bluebird"), require("web3"))
else
  # We expect Promise to already be included.
  window.Pudding = factory(Promise, web3)