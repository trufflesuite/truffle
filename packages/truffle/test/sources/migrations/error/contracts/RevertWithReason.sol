pragma solidity ^0.5.0;


contract RevertWithReason {
  string public id = 'RevertWithReason';
  constructor() public {
    require(false, 'reasonstring');
  }
}
