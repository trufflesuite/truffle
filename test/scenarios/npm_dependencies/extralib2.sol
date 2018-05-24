pragma solidity ^0.4.8;

// This contract depends on a contract from package management
import "@org/pkg/contracts/extralib.sol";

// This name doesn't match its filename.
contract Contract2 is Contract {
  uint public someValue = 0xdeadbeef;

  function doOtherThing() public view returns (uint) {
    return ExtraLibraryX.transformValue(someValue);
  }
}

library ExtraLibrary2 {
    function createNewContract2() public returns (Contract2) {
        return new Contract2();
    }
}
