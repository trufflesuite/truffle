pragma solidity >=0.4.21 <0.6.0;

import "../ResolverBase.sol";

contract ABIResolver is ResolverBase {
    bytes4 constant private ABI_INTERFACE_ID = 0x2203ab56;

    event ABIChanged(bytes32 indexed node, uint256 indexed contentType);

    mapping(bytes32=>mapping(uint256=>bytes)) abis;

    /**
     * Sets the ABI associated with an ENS node.
     * Nodes may have one ABI of each content type. To remove an ABI, set it to
     * the empty string.
     * @param node The node to update.
     * @param contentType The content type of the ABI
     * @param data The ABI data.
     */
    function setABI(bytes32 node, uint256 contentType, bytes calldata data) external authorised(node) {
        // Content types must be powers of 2
        require(((contentType - 1) & contentType) == 0);

        abis[node][contentType] = data;
        emit ABIChanged(node, contentType);
    }

    /**
     * Returns the ABI associated with an ENS node.
     * Defined in EIP205.
     * @param node The ENS node to query
     * @param contentTypes A bitwise OR of the ABI formats accepted by the caller.
     * @return contentType The content type of the return value
     * @return data The ABI data
     */
    function ABI(bytes32 node, uint256 contentTypes) external view returns (uint256, bytes memory) {
        mapping(uint256=>bytes) storage abiset = abis[node];

        for (uint256 contentType = 1; contentType <= contentTypes; contentType <<= 1) {
            if ((contentType & contentTypes) != 0 && abiset[contentType].length > 0) {
                return (contentType, abiset[contentType]);
            }
        }

        return (0, bytes(""));
    }

    function supportsInterface(bytes4 interfaceID) public pure returns(bool) {
        return interfaceID == ABI_INTERFACE_ID || super.supportsInterface(interfaceID);
    }
}
