pragma solidity ^0.4.23;


contract RevertWithReason {
  string public id = 'RevertWithReason';
  constructor() public {
    require(false, 'reasonstring');
  }
}
