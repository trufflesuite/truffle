//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReceiveTest {

  receive() external payable {
  }

  fallback() external {
  }

}

contract FallbackTest {

  fallback() external payable {
  }

}
