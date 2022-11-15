// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Sample {
  uint storedData;

  function setValue(uint x) public {
    storedData = x;
  }

  function getValue() public view returns (uint) {
    return storedData;
  }

  function getValue(uint y) public view returns (uint) {
    return storedData + y;
  }

  function bad() public pure {
    revert("You are a failure");
  }
}
