pragma solidity ^0.4.4;


contract RevertWithReason {
  string public id = 'RevertWithReason';
  constructor() public {
    require(false, 'reasonstring');
  }
}