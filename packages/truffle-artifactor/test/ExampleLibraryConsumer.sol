pragma solidity ^0.5.0;

import "./ExampleLibrary.sol";

contract ExampleLibraryConsumer {
  function triggerLibraryEvent() public {
    ExampleLibrary.triggerLibraryEvent();
  }
}
