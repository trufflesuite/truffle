// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Example {
  constructor() {
    // Remove this and implement your contracts/Example.sol Smart Contract logic.
    require(block.chainid != 1337, "You have to implement contracts/Example.sol's logic");
  }
}
