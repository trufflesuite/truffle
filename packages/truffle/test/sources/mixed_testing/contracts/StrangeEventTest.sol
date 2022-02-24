//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract StrangeEventTest {
  event StrangeEvent(uint indexed, string, string, uint);
  function run() public {
    emit StrangeEvent(0x60, "ABC", "123", 0x60);
  }

  function dontRunThis() public {
    //the presence of this function is just to make it so that
    //StrangeEventTest could notionally emit StrangeEventLibrary.StrangeEvent
    //as part of its own code (the decoder doesn't actually care about that,
    //but it makes the intention clearer :P )
    StrangeEventLibrary.doStuff();
  }
}

library StrangeEventLibrary {
  event StrangeEvent(uint, string, string, uint indexed);

  function doStuff() internal {
    emit StrangeEvent(1, "a", "b", 2); //arbitrary, we're not using this
  }
}

/*
 * Explanation:
 * StrangeEventTest.StrangeEvent(0x60, "ABC", "123", 0x60)
 * encodes as
 * topics:
 * 80500dceb2defa8d2b7262e3575ef96df4f1532158b5e96eae652f3be1ceeb06
 * 0000000000000000000000000000000000000000000000000000000000000060
 * data:
 * 0000000000000000000000000000000000000000000000000000000000000020
 * 0000000000000000000000000000000000000000000000000000000000000060
 * 00000000000000000000000000000000000000000000000000000000000000a0
 * 0000000000000000000000000000000000000000000000000000000000000060
 * 0000000000000000000000000000000000000000000000000000000000000003
 * 4142430000000000000000000000000000000000000000000000000000000000
 * 0000000000000000000000000000000000000000000000000000000000000003
 * 3132330000000000000000000000000000000000000000000000000000000000
 * 
 * If this is decoded with disableChecks set, then it will *also*
 * (incorrectly) decode as
 * StrangeEventLibrary.StrangeEvent(0x60, "123", "ABC", 0x60)
 * (note how the order of the strings is swapped)
 * (the "ABC" and "123" are arbitrary, but the use of 0x60 is not arbitrary!)
 */
