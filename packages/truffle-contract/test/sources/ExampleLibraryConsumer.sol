import "./ExampleLibrary.sol";

contract ExampleLibraryConsumer {
  function triggerLibraryEvent() public {
    ExampleLibrary.triggerLibraryEvent();
  }
}
