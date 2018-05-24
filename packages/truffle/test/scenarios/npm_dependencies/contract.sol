pragma solidity ^0.4.8;

// This contract depends on a contract from package management
import {ExtraLibrary} from "@org/pkg/contracts/extralib.sol";
import {Contract2, ExtraLibrary2} from "dep2/contracts/extralib2.sol";

// This name doesn't match its filename.
contract Contract3 {
  uint public specialValue = 1337;

  function doSpecialThing() public returns (Contract2) {
    specialValue = ExtraLibrary.doThing(specialValue);
    return ExtraLibrary2.createNewContract2();
  }
}
