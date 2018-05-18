pragma solidity ^0.4.4;

library IsLibrary {
  event IsLibraryEvent(uint eventID);

  function fireIsLibraryEvent(uint id) public {
    emit IsLibraryEvent(id);
  }
}