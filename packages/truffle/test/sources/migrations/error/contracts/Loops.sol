pragma solidity ^0.5.0;

contract Loops {
  uint public id;
  constructor() public {
    for (uint i = 0; i < 1000000; i++) {
      id = i;
    }
  }
}
