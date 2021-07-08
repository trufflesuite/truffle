pragma solidity ^0.5.0;

contract Loops {
    uint256 public id;

    constructor() public {
        for (uint256 i = 0; i < 100000; i++) {
            id = i;
        }
    }
}
