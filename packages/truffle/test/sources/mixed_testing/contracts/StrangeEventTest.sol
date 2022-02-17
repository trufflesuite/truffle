//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract StrangeEventTest {
  event StrangeEvent(uint indexed, string, string, uint);
  function run() public {
    emit StrangeEvent(96, "ABC", "123", 96);
  }
}

library StrangeEventLibrary {
  event StrangeEvent(uint, string, string, uint indexed);
}
