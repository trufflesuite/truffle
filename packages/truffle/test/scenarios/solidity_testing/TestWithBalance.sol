pragma solidity ^0.5.0;

import "truffle/Assert.sol";

contract TestWithBalance {
  uint public initialBalance = 1 ether;

  function testInitialBalance() public {
     Assert.equal(address(this).balance, initialBalance, "The balance of this contract should be the same as the initial balance!");
  }
}
