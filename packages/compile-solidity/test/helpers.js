module.exports = {
  findOne: (name, contracts) => {
    const matchingContracts = contracts.filter(
      ({ contractName }) => contractName === name
    );

    // assert
    if (matchingContracts.length !== 1) {
      throw new Error(
        `There should be exactly one contract with name ${name}, ` +
          `got ${matchingContracts.length}`
      );
    }

    return matchingContracts[0];
  }
};
