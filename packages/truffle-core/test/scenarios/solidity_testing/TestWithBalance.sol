pragma solidity ^0.4.8;

import "truffle/Assert.sol";

contract TestWithBalance {
  uint public initialBalance = 1 ether;

  function testInitialBalance() {
     Assert.equal(this.balance, initialBalance, "The balance of this contract should be the same as the initial balance!");
  }
}
