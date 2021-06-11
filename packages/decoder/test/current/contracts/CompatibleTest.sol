//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract CompatibleNativizeTest {

  struct Pair {
    string x;
    string y;
  }

  event String(string z);
  event TwoStrings(string w, string z);
  event StringPair(Pair z);

  function returnString() public pure returns (string memory z) {
    return "hello";
  }

  function emitString() public {
    emit String("hello");
  }

  function returnTwoStrings() public pure returns (string memory w, string memory z) {
    return ("hello", "goodbye");
  }

  function emitTwoStrings() public {
    emit TwoStrings("hello", "goodbye");
  }

  function returnStringPair() public pure returns (Pair memory z) {
    return Pair("hello", "goodbye");
  }

  function emitStringPair() public {
    emit StringPair(Pair("hello", "goodbye"));
  }

  function returnFunction() public view returns (function() external) {
    return this.emitString;
  }
}
