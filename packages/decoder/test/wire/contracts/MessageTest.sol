pragma solidity ^0.6.1;

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
