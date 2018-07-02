pragma solidity ^0.4.4;


contract Loops {
  uint public id;
  constructor() public {
    for(uint i = 0; i < 10000; i++){
      id = i;
    }
  }
}
