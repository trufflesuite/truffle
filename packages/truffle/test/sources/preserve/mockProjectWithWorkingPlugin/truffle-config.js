module.exports = {
  plugins: ["truffle-mock"],
  environments: {
    development: {
      mock: {
        selectedEnvironment: "development"
      }
    },
    production: {
      mock: {
        selectedEnvironment: "production"
      }
    }
  }
};
