module.exports = {
  networks: {
    browser: {
      url: "http://localhost:24012/rpc",
      network_id: "*",
      skipDryRun: true,
      networkCheckTimeout: 120000
    }
  }
};
