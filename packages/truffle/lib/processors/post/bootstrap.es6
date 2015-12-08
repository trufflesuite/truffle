var PuddingLoader = require("ether-pudding/loader");

module.exports = function(contents, file, config, process, callback) {
  PuddingLoader.packageSource(config.environments.current.directory, function(err, result) {
    if (err != null) {
      callback(err);
    } else {

      var contract_names = Object.keys(config.contracts.classes).join(", ");

      contents = `
${result};

${contents};

// Added by Truffle bootstrap.
// Supports Mist, and other wallets that provide 'web3'.
if (typeof web3 !== 'undefined') {
  // Use the Mist/wallet provider.
  window.web3 = new Web3(web3.currentProvider);
} else {
  // Use the provider from the config.
  window.web3 = new Web3(new Web3.providers.HttpProvider("http://${config.app.resolved.rpc.host}:${config.app.resolved.rpc.port}"));
}

Pudding.setWeb3(window.web3);
Pudding.load([${contract_names}], window);
`;

      callback(null, contents);
    }
  });
};
