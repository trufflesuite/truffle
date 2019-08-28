pragma solidity ^0.5.0;

contract RevertingContract {
  uint256 public value;

  constructor() public {
    value = 0;
  }

  function revertingView() public view {
    require(value > 0, "Too reverty of a view");
  }

  function revertingFunction() public {
    require(value > 0, "Too reverty of a function");
  }
}
