const path = require("path");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "app/src/contracts"),
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    }
    /* bdevelopment: {
     *   host: "127.0.0.1",
     *   port: 8541,
     *   network_id: "*"
     * },
     * ydevelopment: {
     *   host: "127.0.0.1",
     *   port: 8549,
     *   network_id: "*"
     * },
     * zdevelopment: {
     *   host: "127.0.0.1",
     *   port: 8549,
     *   network_id: "*"
     * }, */
  },
  db: {
    enable: {
      saveAfter: {
        compile: true,
        migrate: true
      }
    }
  }
};
