pragma solidity ^0.5.0;


contract UsesExample {
  string public id = 'UsesExample';
  address public other;
  constructor(address _other) public {
    other = _other;
  }
}
