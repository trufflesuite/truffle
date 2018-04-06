import "./ExampleLibrary.sol";

contract ExampleLibraryConsumer {
  function triggerLibraryEvent() {
    ExampleLibrary.triggerLibraryEvent();
  }
}
