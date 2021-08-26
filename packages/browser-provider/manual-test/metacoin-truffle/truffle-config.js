const { BrowserProvider } = require('../../dist/lib');

module.exports = {
  networks: {
    browser: {
      provider: () => new BrowserProvider({ dashboardPort: 5000 }),
      network_id: '*',
      skipDryRun: true,
      networkCheckTimeout: 120000,
    },
  }
};
