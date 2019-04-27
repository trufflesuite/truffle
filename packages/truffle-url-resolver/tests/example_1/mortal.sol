pragma solidity ^0.5.0;

contract Mortal {
    /* Define variable owner of the type address */
    address payable owner;

    /* This function is executed at initialization and sets the owner of the contract */
    function mortal() public { owner = msg.sender; }

    /* Function to recover the funds on the contract */
    function kill() public { if (msg.sender == owner) selfdestruct(owner); }
}