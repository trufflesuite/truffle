// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Sample {

  error MyError(uint, string);

  function increment(uint x) public pure returns (uint y) {
    return x + 1;
  }

  function returnPair() public pure returns (uint, string) {
    return (683, "hello");
  }

  function sillySum(uint x, string y) public pure returns (uint) {
    return x + y.length;
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

  function overloaded(uint x) public pure returns (string) {
    return "got uint!";
  }

  function overloaded(address x) public pure returns (string) {
    return "got address!";
  }

  function overloaded(uint x, uint y) public pure returns (string) {
    return "got multiple!";
  }

  function confusing(uint16 x) public pure returns (string) {
    return "uint16!";
  }

  function confusing(int8 x) public pure returns (string) {
    return "int8!";
  }
}
