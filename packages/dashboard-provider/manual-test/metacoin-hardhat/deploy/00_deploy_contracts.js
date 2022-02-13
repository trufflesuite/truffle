// deploy/00_deploy_your_contract.js

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const ConvertLib = await deploy("ConvertLib", {
    from: deployer,
    log: true
  });

  const MetaCoin = await deploy("MetaCoin", {
    from: deployer,
    libraries: { ConvertLib: ConvertLib.address },
    log: true
  });

  const _WrappedMetaCoin = await deploy("WrappedMetaCoin", {
    from: deployer,
    args: [MetaCoin.address],
    log: true
  });
};

module.exports.tags = ["ConvertLib", "MetaCoin", "WrappedMetaCoin"];
