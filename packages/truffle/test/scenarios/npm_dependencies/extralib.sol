pragma solidity ^0.4.8;

// This file defines a library that can be used.
library ExtraLibrary {
    function doThing(uint target) public pure returns (uint) {
        return target + 0xcafe;
    }
}

library ExtraLibraryX {
    function transformValue(uint x) public pure returns (uint) {
        return x - 1;
    }
}

contract Contract {
    uint public specialValue = 1337;

    function doTypicalThing() public {
        specialValue = 0;
    }
}