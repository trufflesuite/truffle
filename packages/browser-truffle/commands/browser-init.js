var command = require("truffle-core/lib/commands/init");
var fs = require("fs");
var path = require("path");

command.run = function(...args) {
  // This looks weird. I need to get to the done function while skipping options, otherwise eslint explodes.
  const [, done] = args;

  try {
    fs.mkdirSync(path.join(__dirname, "contracts"));
    fs.mkdirSync(path.join(__dirname, "migrations"));
    fs.mkdirSync(path.join(__dirname, "test"));

    fs.writeFileSync(
      path.join(__dirname, "truffle-config.js"),
      `
module.exports = {
  // Browser version. Left empty on purpose. Edit at own risk! 
};
    `
    );

    fs.writeFileSync(
      path.join(__dirname, "contracts", "Migrations.sol"),
      `
pragma solidity >=0.4.25 <0.6.0;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  constructor() public {
    owner = msg.sender;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) public restricted {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
    `
    );

    fs.writeFileSync(
      path.join(__dirname, "contracts", "SimpleStorage.sol"),
      `
pragma solidity ^0.5.4;
contract SimpleStorage {
  
  uint public storedData;

  event Change(string message, uint newVal);

  constructor(uint initVal) public {
      emit Change("initialized", initVal);
      storedData = initVal;
  }

  function set(uint x) public {
      emit Change("set", x);
      storedData = x;
  }

  function get() view public returns (uint retVal) {
      return storedData;
  }
}
    `
    );

    fs.writeFileSync(
      path.join(__dirname, "migrations", "1_initial_migration.js"),
      `
const Migrations = artifacts.require("Migrations");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
    `
    );

    fs.writeFileSync(
      path.join(__dirname, "migrations", "2_deploy_simplestorage.js"),
      `
const SimpleStorage = artifacts.require("SimpleStorage");

module.exports = function(deployer) {
  deployer.deploy(SimpleStorage, 5);
}
    `
    );
  } catch (e) {
    return done(e);
  }

  done();
};

module.exports = command;
