pragma solidity ^0.4.4;


contract ExampleError {
  string public id = 'ExampleError';
  constructor() public {
    require(false);
  }
}
