pragma solidity ^0.6.2;

interface IERC20 {
    function totalSupply() external view returns (uint);
    function balanceOf(address tokenOwner) external view returns (uint balance);
    function allowance(address tokenOwner, address spender) external view returns (uint remaining);
    function transfer(address to, uint tokens) external returns (bool success);
    function approve(address spender, uint tokens) external returns (bool success);
    function transferFrom(address from, address to, uint tokens) external returns (bool success);

    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract Forwarder {
  address public destination;
 
  constructor() public {
  }

  function flushERC20(address tokenContractAddress) public {
    IERC20 tokenContract = IERC20(tokenContractAddress);
    uint256 forwarderBalance = tokenContract.balanceOf(address(this));
    tokenContract.transfer(destination, forwarderBalance);
  }
  
  function init(address _destination) public {
      require(destination == address(0x0));
      destination = _destination;
  }
}

contract ForwarderFactory {

  constructor() public {}

  function cloneForwarder(address forwarder, uint256 salt) public returns (Forwarder clonedForwarder) {
    address clonedAddress = createClone(forwarder, salt);
    clonedForwarder = Forwarder(clonedAddress);
    clonedForwarder.init(Forwarder(forwarder).destination());
  }

  function createClone(address target, uint256 salt) private returns (address result) {
    bytes20 targetBytes = bytes20(target);
    assembly {
      let clone := mload(0x40)
      mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
      mstore(add(clone, 0x14), targetBytes)
      mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
      result := create2(0, clone, 0x37, salt)
    }
  }
}


// function buildCreate2Address(senderAddress, saltHex, bytecode) {
//   return web3.utils.toChecksumAddress(`0x${web3.utils.sha3(`0x${[
//     'ff',
//     senderAddress,
//     saltHex,
//     web3.utils.sha3(bytecode)
//   ].map(x => x.replace(/0x/, ''))
//     .join('')}`).slice(-40)}`);
// }