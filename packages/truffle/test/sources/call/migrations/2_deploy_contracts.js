// eslint-disable-next-line no-undef
const Sample = artifacts.require("Sample");

module.exports = function (deployer) {
  deployer.deploy(Sample);
};
