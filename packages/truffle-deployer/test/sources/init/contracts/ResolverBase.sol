pragma solidity >=0.4.21 <0.6.0;

contract ResolverBase {
    bytes4 private constant INTERFACE_META_ID = 0x01ffc9a7;

    function supportsInterface(bytes4 interfaceID) public pure returns(bool) {
        return interfaceID == INTERFACE_META_ID;
    }

    function isAuthorised(bytes32 node) internal view returns(bool);

    modifier authorised(bytes32 node) {
        require(isAuthorised(node));
        _;
    }
}
