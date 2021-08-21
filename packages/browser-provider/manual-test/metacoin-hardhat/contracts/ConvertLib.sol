// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.9.0;

library ConvertLib {
    struct TestStruct {
        uint256 name;
    }

    function convert(uint amount,uint conversionRate) public pure returns (uint convertedAmount)
    {
        return amount * conversionRate;
    }
}
