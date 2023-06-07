// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract SimpleStorage {
  uint value;

  constructor(uint initialValue) {
    value = initialValue;
  }

  function read() public view returns (uint) {
    return value;
  }

  function write(uint newValue) public {
    value = newValue;
  }
}
