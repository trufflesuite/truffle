//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SquareLib.sol";

contract MagicSquare {
  using SquareLib for SquareLib.MagicSquare;

  SquareLib.MagicSquare storedSquare;
  string storedGreeting;
  uint256 immutable minimumSize;

  constructor() public {
    minimumSize = 3;
  }

  function generateMagicSquare(uint n)
    public
  {
    string memory greeting;
    SquareLib.MagicSquare memory square;
    uint256 x;
    uint256 y;

    greeting = "let us construct a magic square:";
    square = SquareLib.initialize(n);

    x = 0;
    y = n / 2;
    for (uint256 i = 1; i <= n * n; i++) {
      (x, y, i) = square.step(x, y, i);
    }

    save(square);
    storedGreeting = "finally, a decentralized magic square service!";
  }

  function save(SquareLib.MagicSquare memory square)
    internal
  {

    storedSquare.n = square.n;
    delete storedSquare.rows;
    if(storedSquare.rows.length > minimumSize) {
      for (uint256 x = 0; x < square.n; x++) {
        storedSquare.rows.push(square.rows[x]);
      }
    }
  }
}
