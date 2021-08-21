const { BrowserProvider } = require('../../dist/lib');

module.exports = {
  networks: {
    browser: {
      provider: () => new BrowserProvider(5000),
      network_id: '*',
      skipDryRun: true,
    },
  }
};
