// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.9.0;

library Console {
  event _TruffleConsoleLog(bool boolean);
  event _TruffleConsoleLog(int num);
  event _TruffleConsoleLog(uint num);
  event _TruffleConsoleLog(string str);
  event _TruffleConsoleLog(bytes32 b32);
  event _TruffleConsoleLog(address addr);

  event _TruffleConsoleLogNamed(bytes32 label, bool boolean);
  event _TruffleConsoleLogNamed(bytes32 label, int num);
  event _TruffleConsoleLogNamed(bytes32 label, uint num);
  event _TruffleConsoleLogNamed(bytes32 label, string str);
  event _TruffleConsoleLogNamed(bytes32 label, bytes32 b32);
  event _TruffleConsoleLogNamed(bytes32 label, address addr);

  function log(bool x) public {
    emit _TruffleConsoleLog(x);
  }

  function log(int x) public {
    emit _TruffleConsoleLog(x);
  }

  function log(uint x) public {
    emit _TruffleConsoleLog(x);
  }

  function log(string memory x) public {
    emit _TruffleConsoleLog(x);
  }

  function log(bytes32 x) public {
    emit _TruffleConsoleLog(x);
  }

  function log(address x) public {
    emit _TruffleConsoleLog(x);
  }

  function log(bytes32 x, bool y) public {
    emit _TruffleConsoleLogNamed(x, y);
  }

  function log(bytes32 x, int y) public {
    emit _TruffleConsoleLogNamed(x, y);
  }

  function log(bytes32 x, uint y) public {
    emit _TruffleConsoleLogNamed(x, y);
  }

  function log(bytes32 x, string memory y) public {
    emit _TruffleConsoleLogNamed(x, y);
  }

  function log(bytes32 x, bytes32 y) public {
    emit _TruffleConsoleLogNamed(x, y);
  }

  function log(bytes32 x, address y) public {
    emit _TruffleConsoleLogNamed(x, y);
  }
}
