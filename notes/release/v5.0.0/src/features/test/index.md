Thanks to the other new features in this release, writing tests for your smart
contracts is now a much more pleasant experience. There's not a whole lot to
say in terms of feature updates except for a couple changes of note:

{"gitdown": "contents", "maxLevel": 5, "rootId": "user-content-what-s-new-in-truffle-v5-truffle-test"}

#### Write your tests in TypeScript

Good news for all you TypeScript lovers, Truffle tests now support TypeScript!

All you have to do is add the following require to your truffle config and you should be good to go!

```javascript
require("ts-node/register");

module.exports = {
  // rest of truffle config
  // ...
}
```


#### Internal improvement: `Assert.sol` builds on separately deployed libraries

This represents no change for Truffle users, but it's been a frustrating
limitation that the cost to deploy `Assert.sol` has always approached the
default block gas limits. Depending on the network you want to use to run your
Solidity tests, this could often be prohibitive.

Well, now that's changed, and `Assert.sol` now just links together a bunch of
separate assertion libraries.

Breathing room for new things to come! :open_mouth:
