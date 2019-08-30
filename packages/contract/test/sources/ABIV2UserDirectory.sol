pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

// credit where it's due - this contract was lifted from this gist:
// https://gist.github.com/ricmoo/e38d4d71dff7156033922d2e5de88d37

contract ABIV2UserDirectory {

  struct Contact {
    string email;
    string phone;
  }

  struct User {
    string name;
    address addr;
    Contact contact;
  }

  address _admin;
  mapping (address => User) _users;

  // User struct in the event
  event UserAdded(address indexed addr, User user);
  constructor() public {
    _admin = msg.sender;
  }

  // User struct in the method signature
  function addUser(User memory user) public {
    require(msg.sender == _admin);
    _users[user.addr] = user;
    emit UserAdded(user.addr, user);
  }

  // User struct in the returns
  function user(address addr) public view returns (User memory user) {
    return _users[addr];
  }
}
