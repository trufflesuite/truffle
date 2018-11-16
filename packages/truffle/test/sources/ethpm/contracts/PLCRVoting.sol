pragma solidity ^0.5.0;

import "tokens/eip20/EIP20.sol";
import "./Local.sol";

contract PLCRVoting is EIP20, Local {

    function isExpired(uint _terminationDate) view public returns (bool expired) {
        return (block.timestamp > _terminationDate);
    }

    function attrUUID(address _user, uint _pollID) public pure returns (bytes32 UUID) {
        return keccak256(_user, _pollID);
    }
}
