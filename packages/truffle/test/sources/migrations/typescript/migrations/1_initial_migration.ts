const Migrations = artifacts.require("./Migrations.sol");

export default function (deployer: any) {
  deployer.deploy(Migrations);
}
