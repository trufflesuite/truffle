const { Shims } = require("@truffle/compile-common");

function shimOutput({ contracts: list, sourceIndexes, compiler }) {
  const contracts = list
    // get old format
    .map(contract => Shims.NewToLegacy.forContract(contract))
    // get pair
    .map(contract => ({ [contract.contract_name]: contract }))
    // merge pairs
    .reduce((a, b) => Object.assign({}, a, b), {});

  return [contracts, sourceIndexes, compiler];
}

module.exports = {
  shimOutput
};
