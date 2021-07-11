// this file will try to load variables named the same as Truffle-injected ones
// Truffle should not allow it to clobber our own injected ones
module.exports = {
  accounts: [ "0x666" ],
  web3: "fakeWeb3",
  interfaceAdapter: "fakeInterfaceAdapter"
}
