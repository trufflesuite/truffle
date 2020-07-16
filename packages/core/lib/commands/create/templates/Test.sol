//SPDX-License-Identifier: MIT
pragma solidity >= 0.4.15 < 0.7.0;

import "truffle/DeployedAddresses.sol";
import "truffle/Assert.sol";

contract Test {
  // Create functions that begin with "test" to signify different test functions.
  // More documentation at http://truffleframework.com/docs/getting_started/solidity-tests

  function testIsTrue() {
     Assert.isTrue(true, "Should be true!");
  }
}
