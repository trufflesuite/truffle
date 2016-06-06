/*
This Token Contract implements a stripped down version of the standard token functionality (https://github.com/ethereum/EIPs/issues/20)
*/

import "ConvertLib.sol";

contract Truffles {

    mapping (address => uint256) balances;
    uint256 public totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals;

    /*function Truffles(
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol
        ) {
        balances[msg.sender] = _initialAmount;
        totalSupply = _initialAmount;
        name = _tokenName;
        decimals = _decimalUnits;
        symbol = _tokenSymbol;
    }*/

    function initiateToken {
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol
        ) {
        balances[msg.sender] = _initialAmount;
        totalSupply = _initialAmount;
        name = _tokenName;
        decimals = _decimalUnits;
        symbol = _tokenSymbol;
    }

    function transfer(address _to, uint256 _value) returns (bool success) {
        if (balances[msg.sender] >= _value && _value > 0) {
            balances[msg.sender] -= _value;
            balances[_to] += _value;
            return true;
        } else { return false; }
    }

    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balances[_owner];
    }

    function getBalanceInEth(address _owner) returns (uint256 balance) {
        return ConvertLib.convert(balanceOf(_owner),2);
    }
}