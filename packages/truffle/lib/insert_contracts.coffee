# Inserted automatically by Truffle.
window.__contracts = {{CONTRACTS}}

for key, contract of window.__contracts
  window[key] = Pudding.whisk(contract.abi)
  window[key].deployed_address = contract.address if contract.address?