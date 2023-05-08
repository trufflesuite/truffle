// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Sample {

  error MyError(uint, string);

  function increment(uint x) public pure returns (uint y) {
    return x + 1;
  }

  function returnPair() public pure returns (uint, string memory) {
    return (683, "hello");
  }

  function sillySum(uint x, string memory y) public pure returns (uint) {
    return x + bytes(y).length;
  }

  function reverts() public pure {
    revert("Oops!");
  }

  function panics() public pure returns (uint) {
    uint x = 0;
    return 1/x;
  }
  
  function throws() public pure {
    revert MyError(107, "goodbye");
  }

  function overloaded(uint x) public pure returns (string memory) {
    return "got uint!";
  }

  function overloaded(address x) public pure returns (string memory) {
    return "got address!";
  }

  function overloaded(uint x, uint y) public pure returns (string memory) {
    return "got multiple!";
  }

  function confusing(uint16 x) public pure returns (string memory) {
    return "uint16!";
  }

  function confusing(int8 x) public pure returns (string memory) {
    return "int8!";
  }
}
