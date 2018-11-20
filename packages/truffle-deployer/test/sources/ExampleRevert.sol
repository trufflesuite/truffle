pragma solidity ^0.5.0;


contract ExampleRevert {
  constructor() public {
    require(false);
  }
}
