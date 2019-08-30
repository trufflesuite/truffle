pragma solidity ^0.5.0;

import "./IsLibrary.sol";

contract UsesLibrary {

  event UsesLibraryEvent(uint eventID);

  constructor() public {}

  function fireIsLibraryEvent(uint id) public {
    IsLibrary.fireIsLibraryEvent(id);
  }

  function fireUsesLibraryEvent(uint id) public {
    emit UsesLibraryEvent(id);
  }
}
