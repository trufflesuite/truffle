export const Runner = {
  orchestrate: async function (declarationTargets) {
    // run each target through the run function, hold output until all are completed,
    // or throw an error
    const targets = declarationTargets.map(async target => {
      target.run(target.run(), { target });
    });
    return targets;
  },
  run: async function (runFn, options) {
    const validOptions = [
      "contractName",
      "action",
      "linkedContract",
      "network"
    ];
    options.map(option => {
      //@TODO add some error handling if option not in validOptions list
      validOptions.includes(option) ? option : "";
    });
    // run each migration here
    runFn();
  }
};
