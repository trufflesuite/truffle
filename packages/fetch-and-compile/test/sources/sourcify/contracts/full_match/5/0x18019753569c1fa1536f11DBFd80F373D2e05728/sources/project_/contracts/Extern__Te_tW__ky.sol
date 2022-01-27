//SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

contract ExternalTestWacky {

  address[] stack;

  function identity(address input) public returns (address output) {
    stack.push(input);
    output = stack[stack.length - 1];
    stack.pop();
  }

}
