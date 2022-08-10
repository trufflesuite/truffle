library ExampleLibrary {
  event LibraryEvent(address indexed _from, uint num);

  function triggerLibraryEvent() public {
    emit LibraryEvent(msg.sender, 8);
  }
}
