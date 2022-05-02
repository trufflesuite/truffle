pragma solidity ^0.5.0;


contract Loops {
  uint public id;
  constructor() public {
    for(uint i = 0; i < 100000000; i++){
      id = i;
    }
  }
}
