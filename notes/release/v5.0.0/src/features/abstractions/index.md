With this new version comes a whole slew of improvements on contract
interaction. Syntax has been modernized, working with events has gotten better,
error reporting has gotten clearer, and structured function parameters are now
supported! It just feels good...

{"gitdown": "contents", "maxLevel": 4, "rootId": "user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts"}

#### EventEmitter / Promise interface

Contract objects now have an EventEmitter interface and return a promise.
You can now interact with them very much like you would interact with
`web3.eth.Contract` objects!

Events also now have an EventEmitter interface.

See the [usage section](https://truffleframework.com/docs/truffle/reference/contract-abstractions#usage) of the Truffle contract abstraction docs for some
examples of working with contract objects and events!

#### `REVERT` Reason strings

Another super useful change is support for `REVERT` reason strings!  Now if a
transaction needs to be reverted, you will receive the reason string and know
why.

#### Confirmation / block wait timeouts config

Previously when a transaction didn't get mined after 50 blocks, the transaction
was dropped.  Now Truffle allows you to configure block timeout amounts on your
contracts.
So for example, say you wanted your contract's transactions to timeout after
1,000 blocks.

```javascript
Example.timeoutBlocks = 1000; // Set the timeout property on the contract abstraction
const example = await Example.new(1);
await example.setValue(5); // The transaction will retry for 1,000 blocks
```

#### WebSockets

Truffle now supports [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
via the `websockets` network config. You will need to enable this if you want
to use the `confirmations` listener or if you want to hear events using
`.on` or `.once`.

In the Truffle config:
```javascript
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      websockets: true
    }
  }
}
```

#### Automated Fueling

You can choose whether you want to have Truffle compute gas amounts for your
transactions.  If `autoGas` is enabled then Truffle will use web3 to estimate
the gas.  Then it will multiply it by a multiplier that is set with
`gasMultiplier` and include that gas amount with the transaction.

```javascript
Example.autoGas = true;    // Defaults to true
Example.gasMultiplier(1.5) // Defaults to 1.25
const instance = await Example.new();
await instance.callExpensiveMethod();
```

#### Overloaded Solidity functions

```javascript
example.methods['setValue(uint256)'](123);
example.methods['setValue(uint256,uint256)'](11, 55);
```

#### Structured function parameters

There is now support for passing/returning structs in Solidity functions.

To use this, you'll have to include the experimental pragma line near the top
of your contracts:

`pragma experimental ABIEncoderV2;`

This allows you to use complex function arguments and return values in Solidity
and interact with the resulting contracts via truffle-contract's JS interface.

<details>
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
