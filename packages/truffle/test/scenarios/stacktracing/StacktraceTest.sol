//SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

contract StacktraceTest {
  function run() public {
    run1();
  }

  function run1() public {
    this.run2();
  }

  function run2() public {
    run3();
  }

  function run3() public {
    revert("Oops!");
  }
}
