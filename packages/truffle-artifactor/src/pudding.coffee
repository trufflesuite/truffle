factory = (Promise, web3) ->
  class Pudding
    # Not to be accessed directly.
    @global_defaults: {} 

    # Main function for creating a Pudding contract.
    @whisk: (abi, code, class_defaults) ->
      if typeof code == "object"
        class_defaults = code
        code = null

      contract = web3.eth.contract(abi)
      # Note: inject_defaults() changes the at() function to take two parameters.
      contract = Pudding.inject_defaults(contract, class_defaults)
      contract = Pudding.synchronize_contract(contract)
      contract = Pudding.make_nicer_new(contract, code)

      if Promise?
        contract = Pudding.promisify_contract(contract)
      return contract

    # Set and return defaults.
    @defaults: (new_global_defaults={}) ->
      for key, value of new_global_defaults
        Pudding.global_defaults[key] = value
      Pudding.global_defaults

    @merge: () ->
      merged = {}

      for object in arguments
        for key, value of object
          merged[key] = value

      merged

    @inject_defaults: (contract_class, class_defaults) ->
      old_at = contract_class.at
      old_new = contract_class.new

      inject = (instance, instance_defaults={}) =>

        # Merge global defaults, class defaults and instance defaults
        # at time of class creation. 
        merged_defaults = @merge(class_defaults, instance_defaults)

        for abi_object in contract_class.abi
          fn_name = abi_object.name
          fn = instance[fn_name]

          continue if !fn?

          # First inject merged defaults for the whole function
          instance[fn_name] = Pudding.inject_defaults_into_function(instance, fn, merged_defaults)

          # Copy over properties of that function to the new one.
          for key, value of fn
            instance[fn_name][key] = value

          # Then inject merged defaults into sendTransaction and call functions
          instance[fn_name].sendTransaction = Pudding.inject_defaults_into_function(instance, fn.sendTransaction, merged_defaults)
          instance[fn_name].call = Pudding.inject_defaults_into_function(instance, fn.call, merged_defaults)

        return instance

      contract_class.at = (address, instance_defaults={}) ->
        instance = old_at.call(contract_class, address)
        return inject(instance, instance_defaults)

      contract_class.new = () =>
        args = Array.prototype.slice.call(arguments)
        callback = args.pop()

        if typeof args[args.length - 1] == "object" and typeof args[args.length - 2] == "object"
          instance_defaults = args.pop()
          tx_params = args.pop()
        else
          instance_defaults = {}

          if args[args.length - 1] == "object"
            tx_params = args.pop()
          else
            tx_params = {}

        tx_params = @merge(Pudding.global_defaults, class_defaults, tx_params)

        args.push tx_params, (err, instance) ->
          if err? 
            callback(err)
            return

          callback(null, inject(instance))
          
        old_new.apply(contract_class, args)

      return contract_class

    @inject_defaults_into_function: (instance, fn, merged_defaults) ->
      return () =>
        args = Array.prototype.slice.call(arguments)
        callback = args.pop()

        # Start with the defaults, creating a new object.
        options = @merge(Pudding.global_defaults, merged_defaults)

        if typeof args[args.length - 1] == "object"
          old_options = args.pop()

          # Override defaults with tx details pased into function.
          options = @merge(options, old_options)

        args.push options, callback

        fn.apply(instance, args)

    @promisify_contract: (contract_class) ->
      old_at = contract_class.at
      old_new = contract_class.new

      promisify = (instance) ->
        # Promisify .call() and .sendTransaction() for functions.
        for key, fn of instance
          continue if typeof fn != "object" and typeof fn != "function"

          for k, v of fn
            continue if typeof fn != "object" and typeof fn != "function"
            fn[k] = Promise.promisify(v, instance)

          instance[key] = Promise.promisify(fn, instance)

        return instance

      contract_class.at = (address, instance_defaults={}) ->
        instance = old_at.call(contract_class, address, instance_defaults)
        return promisify(instance)

      contract_class.new = Promise.promisify(() ->
        args = Array.prototype.slice.call(arguments)
        callback = args.pop()

        args.push (err, instance) ->
          if err?
            callback(err)

          callback null, promisify(instance)

        old_new.apply(contract_class, args)
      )

      return contract_class

    @make_nicer_new: (contract_class, code="") ->
      old_new = contract_class.new
      contract_class.new = () ->
        args = Array.prototype.slice.call(arguments)
        callback = args.pop()

        if typeof args[args.length - 1] == "object" and typeof args[args.length - 2] == "object"
          instance_defaults = args.pop()
          tx_params = args.pop()
        else
          instance_defaults = {}

          if args[args.length - 1] == "object"
            tx_params = args.pop()
          else
            tx_params = {}
        
        if !tx_params.data?
          tx_params.data = code

        args.push(tx_params, instance_defaults, callback)

        return old_new.apply(contract_class, args)
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
      old_new = contract_class.new

      synchronize = (instance) ->
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

      contract_class.at = (address, instance_defaults={}) ->
        instance = old_at.call(contract_class, address, instance_defaults)
        return synchronize(instance)

      contract_class.new = () ->
        args = Array.prototype.slice.call(arguments)
        callback = args.pop()

        args.push (err, instance) ->
          if err? 
            callback(err)
            return

          callback(null, synchronize(instance))

        old_new.apply(contract_class, args)

      return contract_class

  Pudding

if module? and module.exports?
  module.exports = factory(require("bluebird"), require("web3"))
else
  # We expect Promise to already be included.
  window.Pudding = factory(Promise, web3)