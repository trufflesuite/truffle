pragma solidity ^0.5.0;

library IsLibrary {
  string constant public id = 'IsLibrary';
  event IsLibraryEvent(uint eventID);

  function fireIsLibraryEvent(uint _id) public {
    emit IsLibraryEvent(_id);
  }
}
