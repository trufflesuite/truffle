# This file represents code that gets inserted into the frontend
# at build time. It's also used within Node for provisioning the 
# REPL.
__helpers =
  provision_contracts: (g) ->
    g.__contracts = JSON.parse({{CONTRACTS}})

    for key, contract of g.__contracts
      g[key] = Pudding.whisk(contract.abi, contract.binary)
      g[key].deployed_address = contract.address if contract.address?

  set_provider: (g) ->
    if "{{HOST}}" != "" and "{{PORT}}" != ""
      web3.setProvider(new web3.providers.HttpProvider("http://{{HOST}}:{{PORT}}"))
    else
      web3.setProvider(
        (() ->
          return eval("{{PROVIDER}}")
        )()
      )

if !module? 
  __helpers.provision_contracts(window)
  __helpers.set_provider(window)
else
  module.exports = __helpers

