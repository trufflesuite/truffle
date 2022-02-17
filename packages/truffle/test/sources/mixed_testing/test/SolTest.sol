//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "truffle/Assert.sol";

contract Tester {

  function testShouldSucceed() public {
    Assert.isTrue(true, "");
  }

  function testShouldFail() public {
    Assert.fail("");
  }
}
