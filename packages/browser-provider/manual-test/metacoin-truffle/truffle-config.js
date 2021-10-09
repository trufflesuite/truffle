module.exports = {
  networks: {
    browser: {
      url: 'http://localhost:5000/rpc',
      network_id: '*',
      skipDryRun: true,
      networkCheckTimeout: 120000,
    },
  }
};
