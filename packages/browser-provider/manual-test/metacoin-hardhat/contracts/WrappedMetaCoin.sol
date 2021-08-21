// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.9.0;

import { MetaCoin as Coin } from "./MetaCoin.sol";

contract WrappedMetaCoin {
    Coin public underlying;

    constructor(Coin _underlying) public {
        underlying = _underlying;
    }

    function sendCoin(address receiver, uint amount) public returns(bool sufficient) {
        return underlying.sendCoin(receiver, amount);
    }

    function getBalanceInEth(address addr) public view returns(uint){
        return underlying.getBalanceInEth(addr);
    }

    function getBalance(address addr) public view returns(uint) {
        return underlying.getBalance(addr);
    }
}
