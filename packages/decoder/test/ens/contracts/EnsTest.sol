//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

contract EnsTest {

  address namedAddress;
  address public registryAddress;

  constructor(address _registryAddress) {
    namedAddress = msg.sender;
    registryAddress = _registryAddress;
  }
}
