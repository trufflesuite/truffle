pragma solidity ^0.4.4;


contract ExampleRevert {
  constructor() public {
    require(false);
  }
}
