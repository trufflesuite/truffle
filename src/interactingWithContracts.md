### Interacting with Contracts

Thanks to the excellent changes in Web3.js 1.0,
we've implemented the following features.

#### EventEmitter / Promise interface
Contract objects now have an EventEmitter interface and return a promise.  You can now interact with them very much like you would interact with `web3.eth.Contract` objects!

Events also now have an EventEmitter interface.

See the [usage section](https://truffleframework.com/docs/truffle/reference/contract-abstractions#usage) of the Truffle contract abstraction docs for some examples of working with contract objects and events!

#### REVERT Reason strings

#### Confirmation / block wait timeouts config

#### websockets

#### Automated Fueling

#### Overloaded Solidity functions
```javascript
example.methods['setValue(uint256)'](123);
example.methods['setValue(uint256,uint256)'](11, 55);
```

#### BigNumber/BN return format (compatibility)
As mentioned above - truffle-contract now returns BN. We've made this configurable so if you have an existing test suite you'd prefer to gradually transition from BigNumber to BN, it's possible to configure a contract's number format as below.

```javascript
// Choices are:  `["BigNumber", "BN", "String"].
const Example = artifacts.require('Example');
Example.numberFormat = 'BigNumber';
```

#### Structured function parameters
There is now support for passing/returning structs in Solidity functions.
To use this, you'll have to include the experimental pragma line near the top of your contracts:

`pragma experimental ABIEncoderV2;`

This allows you to use complex function arguments and return values in Solidity and interact with the resulting contracts via truffle-contract's JS interface.

<summary>See example contract</summary>

```solidity
pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract Structs {
  struct Coord {
    uint x;
    uint y;
  }

  function swap(Coord memory coord)
    public
    pure
    returns (Coord memory)
  {
    Coord memory reversed = Coord({
      x: coord.y,
      y: coord.x
    });

    return reversed;
  }
}
```
</details>

<details>
<summary>See example test</summary>

```javascript
const Structs = artifacts.require("Structs");

contract("Structs", (accounts) => {
  it("reverses coordinates", async () => {
    const instance = await Structs.deployed();

    const original = { x: 5, y: 8 };

    const reversed = await instance.swap(original, { from: accounts[0] });

    assert.equal(reversed.y, original.x);
    assert.equal(reversed.x, original.y);
  })
});
```
</details>
