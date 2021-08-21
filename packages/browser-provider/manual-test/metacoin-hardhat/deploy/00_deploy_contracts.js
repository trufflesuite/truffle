// deploy/00_deploy_your_contract.js

const { ethers } = require("hardhat");
const { BrowserProvider } = require("../../../dist/lib");

// TODO: This doesn't work yet because Hardhat doesn't allow custom providers in the
// network config and the "hack" I used where I set ethers.provider manually doesn't
// work with hardhat-deploy
module.exports = async ({ getNamedAccounts, deployments }) => {
  ethers.provider = new ethers.providers.Web3Provider(new BrowserProvider());
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const ConvertLib = await deploy("ConvertLib", {
    from: deployer,
    log: true,
  });

  const MetaCoin = await deploy("MetaCoin", {
    from: deployer,
    libraries: { ConvertLib: ConvertLib.address },
    log: true,
  });

  const _WrappedMetaCoin = await deploy("WrappedMetaCoin", {
    from: deployer,
    args: [MetaCoin.address],
    log: true,
  });
};

module.exports.tags = ["ConvertLib", "MetaCoin", "WrappedMetaCoin"];
