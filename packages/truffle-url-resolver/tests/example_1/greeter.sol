pragma solidity ^0.5.0;
import "./mortal.sol";

contract Greeter is Mortal {
    /* Define variable greeting of the type string */
    string greeting;

    /* This runs when the contract is executed */
    constructor(string memory _greeting) public {
        greeting = _greeting;
    }

    /* Main function */
    function greet() public view returns (string memory) {
        return greeting;
    }
}