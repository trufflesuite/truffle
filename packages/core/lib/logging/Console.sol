pragma solidity >=0.4.21 <0.7.0;

library Console {
  event _TruffleLog(bool boolean);
  event _TruffleLog(int num);
  event _TruffleLog(uint num);
  event _TruffleLog(string str);
  event _TruffleLog(bytes32 b32);
  event _TruffleLog(address addr);

  event _TruffleLogNamed(bytes32 label, bool boolean);
  event _TruffleLogNamed(bytes32 label, int num);
  event _TruffleLogNamed(bytes32 label, uint num);
  event _TruffleLogNamed(bytes32 label, string str);
  event _TruffleLogNamed(bytes32 label, bytes32 b32);
  event _TruffleLogNamed(bytes32 label, address addr);

  function log(bool x) public {
    emit _TruffleLog(x);
  }

  function log(int x) public {
    emit _TruffleLog(x);
  }

  function log(uint x) public {
    emit _TruffleLog(x);
  }

  function log(string memory x) public {
    emit _TruffleLog(x);
  }

  function log(bytes32 x) public {
    emit _TruffleLog(x);
  }

  function log(address x) public {
    emit _TruffleLog(x);
  }

  function log(bytes32 x, bool y) public {
    emit _TruffleLogNamed(x, y);
  }

  function log(bytes32 x, int y) public {
    emit _TruffleLogNamed(x, y);
  }

  function log(bytes32 x, uint y) public {
    emit _TruffleLogNamed(x, y);
  }

  function log(bytes32 x, string memory y) public {
    emit _TruffleLogNamed(x, y);
  }

  function log(bytes32 x, bytes32 y) public {
    emit _TruffleLogNamed(x, y);
  }

  function log(bytes32 x, address y) public {
    emit _TruffleLogNamed(x, y);
  }
}
