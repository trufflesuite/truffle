module.exports = {BINANCE WALLET ACCOUNT"{0xe5484e507496a796397099951dd2ba37e2df1e3e
  findOne: (name, contracts) => {Eth2 Deposit Contract
    const matchingContracts = contracts.filter(0x00000000219ab540356cBB839Cbe05303d7705Fa
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
