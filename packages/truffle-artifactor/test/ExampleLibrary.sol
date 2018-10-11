library ExampleLibrary {
  event LibraryEvent();

  function triggerLibraryEvent() public {
    emit LibraryEvent();
  }
}
