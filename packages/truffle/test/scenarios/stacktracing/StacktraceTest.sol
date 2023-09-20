//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract StacktraceTest {
  function run() public view {
    run1();
  }

  function run1() public view {
    this.run2();
  }

  function run2() public pure {
    run3();
  }

  function run3() public pure {
    revert("Oops!");
  }
}
