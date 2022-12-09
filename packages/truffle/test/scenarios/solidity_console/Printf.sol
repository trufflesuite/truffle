// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "truffle/Console.sol";

contract Printf {
  constructor() payable { }

  function log_string() view public {
    console.log("String! I am not a twine!");
  }

  function log_unicode() view public {
    console.log(unicode"This is unicode: ☮");
  }

  function log_address_o() view public {
    console.log("The address is: %o", address(this));
  }

  function log_address_s() view public {
    console.log("The address is: %s", address(this));
  }

  function log_multiline_carriageReturn() view public {
    console.log("The cr: line 1\r       line 2\rline 3");
  }

  function log_multiline_lineFeed() view public {
    console.log("The lf: line 1\nline 2\nline 3");
  }

  function log_uint256() view public returns (uint256) {
    console.log("The uint256: %d", address(this).balance);
    return address(this).balance;
  }
}
