//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleContract {
  event Something();
  function saySomething() public {
    emit Something();
  }
}
