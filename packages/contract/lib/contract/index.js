const debug = require("debug")("contract:contract"); // eslint-disable-line no-unused-vars
let Web3 = require("web3");
let { Tezos } = require("@taquito/taquito");
const loadTezosContract = require("./tezosContract");
const loadEvmContract = require("./evmContract");
const bootstrap = require("./bootstrap");
const constructorMethods = require("./constructorMethods");
const properties = require("./properties");

// For browserified version. If browserify gave us an empty version,
// look for the one provided by the user.
if (typeof Web3 === "object" && Object.keys(Web3).length === 0) {
  Web3 = global.Web3;
}

if (typeof Tezos === "object" && Object.keys(Tezos).length === 0) {
  Tezos = global.Tezos;
}

(function(module) {
  // Accepts an EVM or Tezos contract object or address.
  function Contract(contract) {
    let instance = this;
    const { constructor } = instance;
    const { web3, tezos } = constructor.interfaceAdapter;

    // Core:
    instance.methods = {};
    instance.abi = constructor.abi;
    instance.transactionHash = contract.transactionHash;
    instance.contract = contract;

    if (web3) instance = loadEvmContract(instance, constructor, contract);
    if (tezos) instance = loadTezosContract(instance, constructor, contract);
  }

  Contract._constructorMethods = constructorMethods(Contract);

  // Getter functions are scoped to Contract object.
  Contract._properties = properties;

  bootstrap(Contract);
  module.exports = Contract;

  return Contract;
})(module || {});
