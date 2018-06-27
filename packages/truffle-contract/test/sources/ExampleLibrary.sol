library ExampleLibrary {
  event LibraryEvent(address indexed _from, uint num);

  function triggerLibraryEvent() {
    LibraryEvent(msg.sender, 8);
  }
}
