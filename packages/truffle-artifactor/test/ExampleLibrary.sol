pragma solidity ^0.5.0;

library ExampleLibrary {
  event LibraryEvent();

  function triggerLibraryEvent() public {
    emit LibraryEvent();
  }
}
