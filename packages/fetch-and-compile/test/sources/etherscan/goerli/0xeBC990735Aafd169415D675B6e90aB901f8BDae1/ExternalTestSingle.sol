//SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

library ExternalTestLibrarySingle {
  function pop(address[] storage list) external returns (address out) {
    out = list[list.length - 1];
    list.pop();
  }
}

contract ExternalTestSingle {

  address[] stack;

  function identity(address input) public returns (address) {
    stack.push(input);
    return ExternalTestLibrarySingle.pop(stack);
  }

}
