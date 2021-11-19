module.exports = function (config, options) {
  // Source: ethereum.stackexchange.com/questions/17051
  const networkWhitelist = [
    1, // Mainnet (ETH & ETC)
    2, // Morden (ETC)
    3, // Ropsten
    4, // Rinkeby
    5, // Goerli
    8, // Ubiq
    42, // Kovan (Parity)
    77, // Sokol
    99, // Core

    7762959, // Musiccoin
    61717561 // Aquachain
  ];

  let dryRunOnly, skipDryRun;
  const networkSettingsInConfig = config.networks[config.network];
  if (networkSettingsInConfig) {
    dryRunOnly =
      options.dryRun === true ||
      networkSettingsInConfig.dryRun === true ||
      networkSettingsInConfig["dry-run"] === true;
    skipDryRun =
      options.skipDryRun === true ||
      networkSettingsInConfig.skipDryRun === true ||
      networkSettingsInConfig["skip-dry-run"] === true;
  } else {
    dryRunOnly = options.dryRun === true;
    skipDryRun = options.skipDryRun === true;
  }
  const production =
    networkWhitelist.includes(parseInt(config.network_id)) || config.production;
  const dryRunAndMigrations = production && !skipDryRun;
  return { dryRunOnly, dryRunAndMigrations };
};
