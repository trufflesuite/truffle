// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract ManyParams {
  enum SomeState {
    PreparingToDo,
    Doing,
    Done,
    MightDo,
    WontDo
  }

  constructor(
    bool potato,
    bool[] memory tomato,
    bytes memory b,
    bytes[] memory abc,
    bytes1 b1,
    bytes2 b2,
    bytes5 b5,
    int i,
    int8 i8,
    int32 i32,
    int32[] memory foo,
    uint56 ui56,
    uint128 ui128,
    uint192 ui192,
    uint256 ui256,
    string memory s,
    string[][] memory nest,
    SomeState initialState
  ) {}

  function doSomething(
    address poBox,
    address[] memory poBoxes,
    bytes16 b16,
    bytes24 b24,
    bytes32 b32,
    uint ui,
    uint[] calldata positiveNums,
    uint8 ui8,
    int104 i104,
    int160 i160,
    int224 i224,
    int256 i256,
    SomeState[][][][] memory states
  ) public {}
}
