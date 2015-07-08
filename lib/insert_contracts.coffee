# Inserted automatically by Truffle.
window.__contracts = {{CONTRACTS}}

for key, contract of window.__contracts
  window[key] = Pudding.whisk(contract.abi, contract.binary)
  window[key].deployed_address = contract.address if contract.address?

web3.setProvider(new web3.providers.HttpProvider("http://{{HOST}}:{{PORT}}"))