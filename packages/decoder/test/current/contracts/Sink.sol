//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
pragma experimental ABIEncoderV2;

contract Sink {
  constructor() payable {
  }
  fallback() external payable {
  }
}
