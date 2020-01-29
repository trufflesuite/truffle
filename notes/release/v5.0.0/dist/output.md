<a name="user-content"></a>

# User Content

*It's about to be 2019\! Guess we won't be needing this anymore:*

> ***2018 New Year's Resolutions***
> 
>   - \[x\] *Release Truffle v5* 🎊
>   - \[ \] *Don't eat so much chocolate* 🍫

*Wait. That second one seems suspect. What is that?* :woman\_shrugging:

*Okay, from now on, Truffle's official stance on New Years' Resolutions is not to let anything get in the way of a life of simple luxuries, whether that means confectionary quantities bordering on "medically ill-advised", or anything else similar to that, like what we have for you today.*

<details>
<summary><em>Just kidding...</em></summary>

That's always been the official stance.

<details>
<summary><em>But really...</em> </summary>

Please remember that healthy habits are a useful means of being able to enjoy as much delicious chocolate for as many years as possible. 😋

**Wishing you happy and restful holidays, and a merry 2019\!** ❄️

</details>
</details>

-----

**Presenting Truffle v5.0.0**\! 📯

This major release is the **biggest Truffle release yet**, in terms of the number of new features, the release notes word-count, and most excitingly, the number of individual contributors from all around the world.

To keep this introduction brief, this marks the end of the v5 beta series. We hope you share our feelings when we say that we are truly impressed by the scope of changes and the wonder at the possibilities ahead.

These release notes seek to cover the changes as completely as possible, but if you're looking for historical information, it may be helpful to refer to the release notes from the betas:

  - [v5.0.0-beta.0 – Chocolate Sushi 🍣](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.0)
  - [v5.0.0-beta.1 – Hazelnut Onigiri 🍙](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.1)
  - [v5.0.0-beta.2 – Bento Box of Candy 🍱](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.2)

Anyway, keep scrolling if you're looking for the [table of contents](#user-content-contents), or first read about some highlights. 🔆

-----

<a name="user-content-highlights"></a>

### Highlights

Perhaps most notably, Truffle v5 now features:

  - Improved **`async`/`await` support** everywhere we could manage: in **tests**, **migrations**, **`truffle exec` scripts**, presumably any love letters, **`truffle develop` / `truffle console`**, et cetera.
    
    Much of this is thanks to upgrading to [Web3.js v1.0](https://web3js.readthedocs.io/en/1.0/index.html), which paves the way with its vastly improved interface.
    
    Skip ahead to read about [Interacting with your contracts](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts) or about [`async` Migrations](#user-content-what-s-new-in-truffle-v5-truffle-migrate-async-migrations).

  - **"Bring your own compiler"** is an old name for a new feature that's been on the roadmap for a long time. Truffle v5 offers unprecedented flexibility in its support for compiler integrations. Besides the **native `solc` support** that the name implies, this includes support for **`solc` in Docker**, **automatically downloading `solc`** to match a specified version, an initial implementation of compatibility with the **Vyper programming language**, and an integration point for more advanced **arbitrary compilation workflows**.
    
    See the section on [`truffle compile`](#user-content-what-s-new-in-truffle-v5-truffle-compile) to learn more.

  - A **sweet new migrations system** that gives you **tons of useful information** about your deployments, **automatic dry-runs**, and the ability to configure Truffle to **wait for transaction confirmations** or to **increase block timeouts**.
    
    More below about [`truffle migrate`](#user-content-what-s-new-in-truffle-v5-truffle-migrate).

  - The **beginnings of a plugins system** with a new Truffle command: **`truffle run <external-plugin-command>`**.
    
    It's still early, so we'd love to solicit your feedback on this\! This feature is intentionally minimal to start, so we'd appreciate your thoughts and ideas for it.
    
    See [`truffle run`](#user-content-what-s-new-in-truffle-v5-truffle-run) notes for more.

  - **Opt-in usage analytics** 🎉 to **make Truffle better**\! Please consider enabling this by running:
    
        truffle config --enable-analytics

    **Real talk**: admittedly, we mention this here because we want you to see it.
    
    To make Truffle the best smart contract development tool it can be, good decisions about future updates rely on informed consideration. We promise to [limit the data](#user-content-what-s-new-in-truffle-v5-new-truffle-config-opt-in-analytics) we collect and thank you in advance for helping us adapt to and inform new best practices.

-----

<p align="center">
:love_letter:
</p>

-----

<a name="user-content-contents"></a>

## Contents

  - [Highlights](#user-content-highlights)
  - [Contents](#user-content-contents)
  - [How to upgrade](#user-content-how-to-upgrade)
  - [Breaking changes](#user-content-breaking-changes)
      - [Truffle](#user-content-breaking-changes-truffle)
      - [Web3.js v1.0](#user-content-breaking-changes-web3-js-v1-0)
      - [Solidity v0.5](#user-content-breaking-changes-solidity-v0-5)
      - [Note for Quorum users](#user-content-breaking-changes-note-for-quorum-users)
  - [What's new in Truffle v5](#user-content-what-s-new-in-truffle-v5)
      - [Interacting with your contracts](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts)
      - [`truffle compile`](#user-content-what-s-new-in-truffle-v5-truffle-compile)
      - [`truffle migrate`](#user-content-what-s-new-in-truffle-v5-truffle-migrate)
      - [`truffle console` / `truffle develop`](#user-content-what-s-new-in-truffle-v5-truffle-console-truffle-develop)
      - [`truffle debug`](#user-content-what-s-new-in-truffle-v5-truffle-debug)
      - [`truffle test`](#user-content-what-s-new-in-truffle-v5-truffle-test)
      - [`truffle unbox`](#user-content-what-s-new-in-truffle-v5-truffle-unbox)
      - [**New**: `truffle run`](#user-content-what-s-new-in-truffle-v5-new-truffle-run)
      - [**New**: `truffle help`](#user-content-what-s-new-in-truffle-v5-new-truffle-help)
      - [**New**: `truffle config`](#user-content-what-s-new-in-truffle-v5-new-truffle-config)
  - [Changelog since 5.0.0-beta.2](#user-content-changelog-since-5-0-0-beta-2)
  - [Acknowledgments](#user-content-acknowledgments)

<a name="user-content-how-to-upgrade"></a>

## How to upgrade

    npm uninstall -g truffle
    npm install -g truffle

<a name="user-content-breaking-changes"></a>

## Breaking changes

<sup>\[ [∧](#user-content-contents) *Back to contents* | *Skip to what's new* [∨](#user-content-what-s-new-in-truffle-v5) \]</sup>

Truffle v5 is a major release and contains some breaking changes.

Most notably, the upgrades to [Web3.js v1.0](https://web3js.readthedocs.io/en/1.0/index.html) and [Solidity v0.5](https://solidity.readthedocs.io/en/v0.5.1/) can be a high-impact change to existing projects.

This section identifies many of the updates to be aware of, but note that this list may not be complete. If you find a breaking change not on this list, please let us know so that we can include it\!

<a name="user-content-breaking-changes-truffle"></a>

### Truffle

  - Numeric return values are now [BN](https://github.com/indutny/bn.js/) objects instead of the previously default [BigNumber.js](https://github.com/MikeMcl/bignumber.js). These two projects use significantly different API semantics, so you may want to review those.
    
    Truffle provides a compatibility mode for projects unable to make the switch wholesale. Set `numberFormat` to `"BigNumber"`, `"String"`, or `"BN"` to choose.
    
    <details>
    <summary>See example number format override</summary>

    ``` javascript
    // Choices are:  `["BigNumber", "BN", "String"].
    const Example = artifacts.require("Example");
    Example.numberFormat = "BigNumber";
    ```
    
    </details>

  - The `.at(<address>)` method for **truffle-contract** constructors is now `async`.

<a name="user-content-breaking-changes-web3-js-v1-0"></a>

### Web3.js v1.0

  - Addresses are now checksummed (mixed-case) instead of all lower-case.

  - Numbers returned directly from Web3 (i.e. not from **truffle-contract**) are now `string`s. You can use `web3.utils.toBN()` to convert these.
    
    <details>
    <summary>See example string to BN conversion</summary>

    ``` javascript
    const stringBalance = await web3.eth.getBalance('0xabc..');
    const bnBalance = web3.utils.toBN(stringBalance);
    ```
    
    </details>

  - Many of the Web3 utility functions are now scoped under [`web3.utils`](https://web3js.readthedocs.io/en/1.0/web3-utils.html).
    
    Some of these functions have changed slightly, so be on the lookout if you encounter errors about functions being undefined or strange errors arising from these utilities. (Thanks @Zacharius for pointing this out\!)

  - Functions that return multiple values now return an object with both named and indexed keys.

  - Function arguments of type `bytes` must now be converted to hexadecimal bytestrings using [`web3.utils.asciiToHex()`](https://web3js.readthedocs.io/en/1.0/web3-utils.html#asciitohex).

  - The underlying `.contract` property of **truffle-contract** objects is the completely different [`web3.eth.Contract`](https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html).

<a name="user-content-breaking-changes-solidity-v0-5"></a>

### Solidity v0.5

  - *Solidity's own [breaking changes docs](https://solidity.readthedocs.io/en/v0.5.1/050-breaking-changes.html) cover this far better than these release notes will ever do justice* 🙊.
    
    **Don't want to upgrade your contracts right now?** Scroll down to learn how to [specify your compiler version](#user-content-what-s-new-in-truffle-v5-truffle-compile-solidity-specify-your-compiler-version) and continue using v0.4.

<a name="user-content-breaking-changes-note-for-quorum-users"></a>

### Note for Quorum users

  - Recently, one user (thanks @EdsonAlcala\!) brought to our attention that Truffle v5 may break support for [Quorum](https://www.jpmorgan.com/global/Quorum). After investigating some potential quick solutions to this issue, we have concluded that further development effort is required to ensure we do not incur additional risk at the end of this release cycle.
    
    We consider maintaining Quorum support to be a top priority and intend to re-establish this support in early January. In the meantime, if you are using Truffle on a Quorum blockchain and run into trouble, please try rolling back to v4 for the time being. We apologize for this inconvenience.

<a name="user-content-what-s-new-in-truffle-v5"></a>

## What's new in Truffle v5

<a name="user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts"></a>

### Interacting with your contracts

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

With this new version comes a whole slew of improvements on contract interaction. Syntax has been modernized, working with events has gotten better, error reporting has gotten clearer, and structured function parameters are now supported\! It just feels good...

  - [EventEmitter / Promise interface](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-eventemitter-promise-interface)
  - [`REVERT` Reason strings](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-revert-reason-strings)
  - [Confirmation / block wait timeouts config](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-confirmation-block-wait-timeouts-config)
  - [WebSockets](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-websockets)
  - [Automated Fueling](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-automated-fueling)
  - [Overloaded Solidity functions](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-overloaded-solidity-functions)
  - [Structured function parameters](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-structured-function-parameters)

<a name="user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-eventemitter-promise-interface"></a>

#### EventEmitter / Promise interface

Contract objects now have an EventEmitter interface and return a promise. You can now interact with them very much like you would interact with `web3.eth.Contract` objects\!

Events also now have an EventEmitter interface.

See the [usage section](https://truffleframework.com/docs/truffle/reference/contract-abstractions#usage) of the Truffle contract abstraction docs for some examples of working with contract objects and events\!

<a name="user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-revert-reason-strings"></a>

#### <code>REVERT</code> Reason strings

Another super useful change is support for `REVERT` reason strings\! Now if a transaction needs to be reverted, you will receive the reason string and know why.

<a name="user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-confirmation-block-wait-timeouts-config"></a>

#### Confirmation / block wait timeouts config

Previously when a transaction didn't get mined after 50 blocks, the transaction was dropped. Now Truffle allows you to configure block timeout amounts on your contracts. So for example, say you wanted your contract's transactions to timeout after 1,000 blocks.

``` javascript
Example.timeoutBlocks = 1000; // Set the timeout property on the contract abstraction
const example = await Example.new(1);
await example.setValue(5); // The transaction will retry for 1,000 blocks
```

<a name="user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-websockets"></a>

#### WebSockets

Truffle now supports [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) via the `websockets` network config. You will need to enable this if you want to use the `confirmations` listener or if you want to hear events using `.on` or `.once`.

In the Truffle config:

``` javascript
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

<a name="user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-automated-fueling"></a>

#### Automated Fueling

You can choose whether you want to have Truffle compute gas amounts for your transactions. If `autoGas` is enabled then Truffle will use web3 to estimate the gas. Then it will multiply it by a multiplier that is set with `gasMultiplier` and include that gas amount with the transaction.

``` javascript
Example.autoGas = true;    // Defaults to true
Example.gasMultiplier(1.5) // Defaults to 1.25
const instance = await Example.new();
await instance.callExpensiveMethod();
```

<a name="user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-overloaded-solidity-functions"></a>

#### Overloaded Solidity functions

``` javascript
example.methods['setValue(uint256)'](123);
example.methods['setValue(uint256,uint256)'](11, 55);
```

<a name="user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts-structured-function-parameters"></a>

#### Structured function parameters

There is now support for passing/returning structs in Solidity functions.

To use this, you'll have to include the experimental pragma line near the top of your contracts:

`pragma experimental ABIEncoderV2;`

This allows you to use complex function arguments and return values in Solidity and interact with the resulting contracts via truffle-contract's JS interface.

<details>
<summary>See example contract</summary>

``` solidity
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

``` javascript
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

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile"></a>

### <code>truffle compile</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

Lots of great improvements to `truffle compile`\! :gear:

  - [Solidity](#user-content-what-s-new-in-truffle-v5-truffle-compile-solidity)
      - [Specify your compiler version](#user-content-what-s-new-in-truffle-v5-truffle-compile-solidity-specify-your-compiler-version)
      - [Use Docker or native `solc`](#user-content-what-s-new-in-truffle-v5-truffle-compile-solidity-use-docker-or-native-solc)
      - [Note on `compilers` config](#user-content-what-s-new-in-truffle-v5-truffle-compile-solidity-note-on-compilers-config)
  - [Vyper](#user-content-what-s-new-in-truffle-v5-truffle-compile-vyper)
      - [Getting started with Vyper](#user-content-what-s-new-in-truffle-v5-truffle-compile-vyper-getting-started-with-vyper)
  - [Other compilers](#user-content-what-s-new-in-truffle-v5-truffle-compile-other-compilers)

We're really excited by what we've built here, which includes:

  - Use your preferred Solidity version, including native and Docker builds
  - Write your contracts in Vyper
  - Hook into arbitrary compilation workflows (e.g. write contracts in Rust + `cargo`\!)

Keep reading to learn more. This effort is just the beginning—we have ideas for plenty of other potential enhancements, and we can't wait to expand on this foundation that Truffle v5 lays out.

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile-solidity"></a>

#### Solidity

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile-solidity-specify-your-compiler-version"></a>

##### Specify your compiler version

Specify the version of Solidity you'd like to use, and Truffle will automatically download the correct compiler for you\! 💾

Use this feature by specifying `compilers.solc.version` in your Truffle config.

<details>
<summary>Example: Use the latest <code>solc</code> compatible with v0.4.22</summary>

``` javascript
module.exports = {
  /* ... rest of config */

  compilers: {
    solc: {
      version: "^0.4.22"
    }
  }
}
```

</details>

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile-solidity-use-docker-or-native-solc"></a>

##### Use Docker or native <code>solc</code>

Truffle also supports using the Solidity Docker image or a natively installed `solc` compiler. Using one of these distributions can provide a \>3x speed improvement over the default [solc-js](https://www.npmjs.com/package/solc).

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile-solidity-use-docker-or-native-solc-speed-comparison"></a>

###### Speed Comparison

Using Docker or native binaries provides a significant speed improvement, particularly when compiling a large number of files.

**Table**: Time to run `truffle compile` on a MacBook Air 1.8GHz, Node v8.11.1:

| Project              | \# files | solcjs | docker | native |
| -------------------- | -------: | -----: | -----: | -----: |
| truffle/metacoin-box |        3 |   4.4s |   4.4s |   4.7s |
| gnosis/pm-contracts  |       34 |  21.7s |  10.9s |  10.2s |
| zeppelin-solidity    |      107 |  36.7s |  11.7s |  11.1s |

<details>
<summary>See example Docker configuration</summary>

``` javascript
module.exports = {
  /* ... */

  compilers: {
    solc: {
      version: "0.4.25",
      docker: true
    }
  }
}
```

**Note**: Truffle doesn't auto-pull Docker images right now. You'll need to run `docker pull ethereum/solc:0.5.1` yourself. Sorry for the inconvenience\!

</details>

<details>
<summary>See example native configuration</summary>

``` javascript
module.exports = {
  /* ... */

  compilers: {
    solc: {
      version: "native",
    }
  }
}
```

**Note** This requires `solc` to be installed and available on your PATH. For information on installing Solidity, see the [Installing](https://solidity.readthedocs.io/en/v0.5.1/installing-solidity.html) section of the Solidity docs.

</details>

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile-solidity-note-on-compilers-config"></a>

##### Note on <code>compilers</code> config

The `solc` config property has been moved to `compilers` and normalized a bit. Compiler settings are now grouped inside `compilers.solc.settings`. For more information, see the [compiler configuration docs](https://truffleframework.com/docs/truffle/reference/configuration#compiler-configuration).

<details>
<summary>Example compiler settings</summary>

``` javascript
module.exports = {
  /* ... rest of config */

  compilers: {
    solc: {
      version: "0.5.1",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200   // Optimize for how many times you intend to run the code
        },
        evmVersion: "homestead"  // Default: "byzantium"
      }
    }
  }
}
```

</details>

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile-vyper"></a>

#### Vyper

Truffle now supports Vyper\! 🐍

**Note**: Support for Vyper is still early, so there may be bugs. You'll have to install the Vyper compiler yourself. Please see the docs on [Installing Vyper](https://vyper.readthedocs.io/en/latest/installing-vyper.html).

Once you have the Vyper compiler installed, Truffle will automatically compile any `*.vy` files in your `contracts/` directory.

Thank you @evgeniuz for implementing this and thank you @vs77bb for funding the [GitCoin bounty](https://gitcoin.co/issue/trufflesuite/truffle/1144/1037) for this work.

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile-vyper-getting-started-with-vyper"></a>

##### Getting started with Vyper

We've published a Truffle Box to help you get started. If you're curious about using Vyper for your smart contracts, or just want to test it out, you can run:

    truffle unbox vyper-example

Let us know what you think\!

<a name="user-content-what-s-new-in-truffle-v5-truffle-compile-other-compilers"></a>

#### Other compilers

In cases where you need a bit more customization, you can now add an `external` property to the config. You would use this in cases where you have a command that generates artifacts, a command that generates custom artifacts from Truffle artifacts, or where you want to customize the artifacts that Truffle generates.

If you were to have a script named `myScript.sh` which outputs artifacts to `./myBuildFolder`, you would configure the truffle config file as follows:

``` javascript
module.exports = {
  compilers: {
    external: {
      command: "myScript.sh",
      targets: [{
        path: "./myBuildFolder/*.json"
      }]
    }
  }
}
```

This would run your compilation script, locate all the json files in `myBuildFolder`, and then copy them into your Truffle project's build folder with the rest of your compiled contracts as part of the compilation process.

<a name="user-content-what-s-new-in-truffle-v5-truffle-migrate"></a>

### <code>truffle migrate</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

There have been a whole bunch of changes made to Truffle's migration function.

  - [Improved error messaging](#user-content-what-s-new-in-truffle-v5-truffle-migrate-improved-error-messaging)
  - [More output](#user-content-what-s-new-in-truffle-v5-truffle-migrate-more-output)
  - [Improved dry run](#user-content-what-s-new-in-truffle-v5-truffle-migrate-improved-dry-run)
  - [Wait for confirmations and custom block timeouts](#user-content-what-s-new-in-truffle-v5-truffle-migrate-wait-for-confirmations-and-custom-block-timeouts)
  - [`async` Migrations](#user-content-what-s-new-in-truffle-v5-truffle-migrate-async-migrations)

<a name="user-content-what-s-new-in-truffle-v5-truffle-migrate-improved-error-messaging"></a>

#### Improved error messaging

Now if Truffle can guess why a deployment failed it tells you and suggests some possible solutions.

<a name="user-content-what-s-new-in-truffle-v5-truffle-migrate-more-output"></a>

#### More output

The information that Truffle provides during migrations is now more robust. There is much more about what's going on as you deploy, including cost summaries and real-time status updates about how long transactions have been pending. (See GIF below)

<a name="user-content-what-s-new-in-truffle-v5-truffle-migrate-improved-dry-run"></a>

#### Improved dry run

Now if you are deploying to a known public network, Truffle will automatically do a test dry run beforehand. You can also use the `--interactive` flag at the command line to get a prompt between your dry run and real deployment.

<a name="user-content-what-s-new-in-truffle-v5-truffle-migrate-wait-for-confirmations-and-custom-block-timeouts"></a>

#### Wait for confirmations and custom block timeouts

You can now configure the number of block confirmations to wait between deployments. This is helpful when deploying to Infura because their load balancer sometimes executes back-to-back transactions out of sequence and noncing can go awry. You can also specify how many blocks to wait before timing out a pending deployment.

``` javascript
module.exports = {
  networks: {
    ropsten: {
      provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io`),
      network_id: 3,
      gas: 5500000,           // Default gas to send per transaction
      gasPrice: 10000000000,  // 10 gwei (default: 20 gwei)
      confirmations: 2,       // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,     // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true        // Skip dry run before migrations? (default: false for public nets )
    }
  }
}
```

<a name="user-content-what-s-new-in-truffle-v5-truffle-migrate-async-migrations"></a>

#### <code>async</code> Migrations

The deployer interface now works seamlessly with ES6 **async/await** syntax. (Also backward compatible with Truffle V4's then-able pattern.)

*Example Migration using async / await*

``` javascript
const One = artifacts.require("One");
const Two = artifacts.require("Two");

module.exports = async function(deployer) {
  await deployer.deploy(One);

  const one = await One.deployed();
  const value = await one.value();

  await deployer.deploy(Two, value);
};
```

**Deploying to Rinkeby...**

![migrate-rinkeby](https://user-images.githubusercontent.com/7332026/43867960-3499922c-9b20-11e8-8553-589308a6cd61.gif)

<a name="user-content-what-s-new-in-truffle-v5-truffle-console-truffle-develop"></a>

### <code>truffle console</code> / <code>truffle develop</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

Truffle v5 includes a couple handy console enhancements.

  - [`await` in the console](#user-content-what-s-new-in-truffle-v5-truffle-console-truffle-develop-await-in-the-console)
  - [Configure `truffle develop`](#user-content-what-s-new-in-truffle-v5-truffle-console-truffle-develop-configure-truffle-develop)

<a name="user-content-what-s-new-in-truffle-v5-truffle-console-truffle-develop-await-in-the-console"></a>

#### <code>await</code> in the console

The `await` keyword now works in `truffle console` and `truffle develop`\!

``` javascript
truffle(develop)> let instance = await Example.deployed();
truffle(develop)> await instance.someFunc();
```

<a name="user-content-what-s-new-in-truffle-v5-truffle-console-truffle-develop-configure-truffle-develop"></a>

#### Configure <code>truffle develop</code>

Override the network settings for `truffle develop` and specify any of the available [ganache-core options](https://github.com/trufflesuite/ganache-core#usage).

``` javascript
module.exports = {
  /* ... rest of config */

  networks: {
    /* ... other networks */

    "develop": {
      accounts: 5,
      defaultEtherBalance: 500,
      blockTime: 3
    }
  }
};
```

<a name="user-content-what-s-new-in-truffle-v5-truffle-debug"></a>

### <code>truffle debug</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

Hard work continues on improving the user experience of our Solidity debugger. Most of the changes here are behind the scenes, but there's a handful of updates to pinpoint:

  - [Breakpoints](#user-content-what-s-new-in-truffle-v5-truffle-debug-breakpoints)
  - [Inspect variables at end of trace](#user-content-what-s-new-in-truffle-v5-truffle-debug-inspect-variables-at-end-of-trace)
  - [Reset command](#user-content-what-s-new-in-truffle-v5-truffle-debug-reset-command)

<a name="user-content-what-s-new-in-truffle-v5-truffle-debug-breakpoints"></a>

#### Breakpoints

Debugger breakpoints are now a whole lot better\! Specify your breakpoints by file and line number so you can jump ahead to relevant sections of your code.

    MagicSquare.sol:
    
    11:   event Generated(uint n);
    12:
    13:   function generateMagicSquare(uint n)
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    
    debug(develop:0x91c817a1...)> b SquareLib:5
    Breakpoint added at line 5 in SquareLib.sol.
    
    debug(develop:0x91c817a1...)> b +10
    Breakpoint added at line 23.
    
    debug(develop:0x91c817a1...)> B +10
    Breakpoint removed at line 23.

<a name="user-content-what-s-new-in-truffle-v5-truffle-debug-inspect-variables-at-end-of-trace"></a>

#### Inspect variables at end of trace

The debugger no longer automatically exits when you reach the end of a transaction\! You can now inspect `(v)`ariables when execution finishes. This can be helpful, since you no longer need to be as careful when stepping repeatedly\!

<a name="user-content-what-s-new-in-truffle-v5-truffle-debug-reset-command"></a>

#### Reset command

Type `r` to reset back to the beginning of the trace\! Not much else to say about that, we're sure you can appreciate that this might come in handy. Enjoy\!

<a name="user-content-what-s-new-in-truffle-v5-truffle-test"></a>

### <code>truffle test</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

Thanks to the other new features in this release, writing tests for your smart contracts is now a much more pleasant experience. There's not a whole lot to say in terms of feature updates except for a couple changes of note:

  - [Write your tests in TypeScript](#user-content-what-s-new-in-truffle-v5-truffle-test-write-your-tests-in-typescript)
  - [Internal improvement: `Assert.sol` builds on separately deployed libraries](#user-content-what-s-new-in-truffle-v5-truffle-test-internal-improvement-assert-sol-builds-on-separately-deployed-libraries)

<a name="user-content-what-s-new-in-truffle-v5-truffle-test-write-your-tests-in-typescript"></a>

#### Write your tests in TypeScript

Good news for all you TypeScript lovers, Truffle tests now support TypeScript\!

All you have to do is add the following require to your truffle config and you should be good to go\!

``` javascript
require("ts-node/register");

module.exports = {
  // rest of truffle config
  // ...
}
```

<a name="user-content-what-s-new-in-truffle-v5-truffle-test-internal-improvement-assert-sol-builds-on-separately-deployed-libraries"></a>

#### Internal improvement: <code>Assert.sol</code> builds on separately deployed libraries

This represents no change for Truffle users, but it's been a frustrating limitation that the cost to deploy `Assert.sol` has always approached the default block gas limits. Depending on the network you want to use to run your Solidity tests, this could often be prohibitive.

Well, now that's changed, and `Assert.sol` now just links together a bunch of separate assertion libraries.

Breathing room for new things to come\! 😮

<a name="user-content-what-s-new-in-truffle-v5-truffle-unbox"></a>

### <code>truffle unbox</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

There have been some changes made to the `init` and `unbox` commands.

  - [Prompt to overwrite files](#user-content-what-s-new-in-truffle-v5-truffle-unbox-prompt-to-overwrite-files)
  - [`--force`](#user-content-what-s-new-in-truffle-v5-truffle-unbox-force)
  - [Unbox from a branch or a subdirectory](#user-content-what-s-new-in-truffle-v5-truffle-unbox-unbox-from-a-branch-or-a-subdirectory)

<a name="user-content-what-s-new-in-truffle-v5-truffle-unbox-prompt-to-overwrite-files"></a>

#### Prompt to overwrite files

To avoid accidentally overwriting files, in the past Truffle would not allow you to unbox or init in a directory that was not empty. With version 5, Truffle allows you to do so. When it finds files that have name conflicts with the files being copied, it will prompt you for each conflict and ask if you want to overwrite the existing files\!

<a name="user-content-what-s-new-in-truffle-v5-truffle-unbox-force"></a>

#### <code>--force</code>

If you don't want to deal with the prompts and know what you are doing, you can now also just bypass the prompting stage. You can do this by using a `--force` option. If you use this option, Truffle automatically overwrites any files that have name conflicts with the files being copied. Make sure you are careful when using this option so you don't overwrite anything you want to keep\!

<a name="user-content-what-s-new-in-truffle-v5-truffle-unbox-unbox-from-a-branch-or-a-subdirectory"></a>

#### Unbox from a branch or a subdirectory

One last thing that has been changed with these commands is the ability to unbox from a branch or subdirectory. Now you can unbox projects in the following formats:

``` shell
truffle unbox https://github.com/truffle-box/bare-box#remote-branch-on-github
truffle unbox git@github.com:truffle-box/bare-box#web3-one:directory/subDirectory
```

<a name="user-content-what-s-new-in-truffle-v5-new-truffle-run"></a>

### <strong>New</strong>: <code>truffle run</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

We have big plans to support third-party plugins, and here's the start of that with the new `truffle run` command. Let us know what you think\!

Special thanks to @rocky and @daniyarchambylov for their feedback and fixes in helping us bring you the first iteration of this feature.

  - [Plugin installation / usage](#user-content-what-s-new-in-truffle-v5-new-truffle-run-plugin-installation-usage)
  - [Creating a custom command plugin](#user-content-what-s-new-in-truffle-v5-new-truffle-run-creating-a-custom-command-plugin)

<a name="user-content-what-s-new-in-truffle-v5-new-truffle-run-plugin-installation-usage"></a>

#### Plugin installation / usage

<ol>
<li><p>Install the plugin from NPM.</p>

    npm install --save-dev truffle-plugin-hello

</li>

<li>
<p>Add a <code>plugins</code> section to your Truffle config.</p>
<details>
<summary>Example configuration</summary>

``` javascript
module.exports = {
  /* ... rest of truffle-config */

  plugins: [
    "truffle-plugin-hello"
  ]
}
```

</details>
</li>

<li><p>Run the command</p>
<details>
<summary>In the command line</summary>

    $ truffle run hello
    Hello, World!

</summary>
</details>
</li>
</ol>

<a name="user-content-what-s-new-in-truffle-v5-new-truffle-run-creating-a-custom-command-plugin"></a>

#### Creating a custom command plugin

<ol>
<li><p>Implement the command as a Node module with a function as its default export.</p>
<details>
  <summary>Example: <code>hello.js</code></summary>

``` javascript
/**
 * Outputs `Hello, World!` when running `truffle run hello`,
 * or `Hello, ${name}` when running `truffle run hello [name]`
 * @param {Config} config - A truffle-config object.
 * Has attributes like `truffle_directory`, `working_directory`, etc.
 * @param {(done|callback)} [done=done] - A done callback, or a normal callback.
 */
module.exports = (config, done) => {
  // config._ has the command arguments.
  // config_[0] is the command name, e.g. "hello" here.
  // config_[1] starts remaining parameters.
  let name = config._.length > 1 ? config._[1] : 'World!';
  console.log(`Hello, ${name}`);
  done();
}
```

</details></p>

<li><p>Define a `truffle-plugin.json` file to specify the command.</p>
<details>
  <summary>Example: <code>truffle-plugin.json</code></summary>

``` json
{
  "commands": {
    "hello": "hello.js"
  }
}
```

</details></li>

<li><p>Publish to NPM</p>
<p>For example, publish <code>truffle-plugin-hello</code></p></li>
</ol>

<a name="user-content-what-s-new-in-truffle-v5-new-truffle-help"></a>

### <strong>New</strong>: <code>truffle help</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

Truffle now has a help system on board\! Want to figure out what commands are available? Simply run `truffle help`. Want to figure out usage information for a command and what options are available? Run `truffle help <command>`.

    $ truffle help migrate
      Usage:        truffle migrate [--reset] [-f <number>] [--network <name>] [--compile-all] [--verbose-rpc] [--interactive]
      Description:  Run migrations to deploy contracts
      Options:
                    --reset
                        Run all migrations from the beginning, instead of running from the last completed migration.
                    -f <number>
                        Run contracts from a specific migration. The number refers to the prefix of the migration file.
                    --network <name>
                        Specify the network to use, saving artifacts specific to that network. Network name must exist
                        in the configuration.
                    --compile-all
                        Compile all contracts instead of intelligently choosing which contracts need to be compiled.
                    --verbose-rpc
                        Log communication between Truffle and the Ethereum client.
                    --interactive
                        Prompt to confirm that the user wants to proceed after the dry run.

<a name="user-content-what-s-new-in-truffle-v5-new-truffle-config"></a>

### <strong>New</strong>: <code>truffle config</code>

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

Besides the usual `truffle-config.js` (the config file formerly known as `truffle.js`), Truffle now incorporates a user-level configuration. Expect to see more features that take advantage of this\!

  - [Unique `truffle develop` mnemonics](#user-content-what-s-new-in-truffle-v5-new-truffle-config-unique-truffle-develop-mnemonics)
  - [Opt-in Analytics](#user-content-what-s-new-in-truffle-v5-new-truffle-config-opt-in-analytics)
  - [More to come\!](#user-content-what-s-new-in-truffle-v5-new-truffle-config-more-to-come)

<a name="user-content-what-s-new-in-truffle-v5-new-truffle-config-unique-truffle-develop-mnemonics"></a>

#### Unique <code>truffle develop</code> mnemonics

When you run `truffle develop`, Truffle no longer uses the classic `candy maple...` mnemonic. Instead, the first time you run the command it will generate a random mnemonic just for you and persist it\!

We encourage you to exercise caution when working with mnemonics and private keys, and recommend that everyone do their own research when it comes to protecting their crypto security.

<a name="user-content-what-s-new-in-truffle-v5-new-truffle-config-opt-in-analytics"></a>

#### Opt-in Analytics

To try and obtain more information about how we can improve Truffle, we have added an optional new analytics feature. By default it is turned off but if you enable it, the Truffle developers will receive anonymous information about your version number, the commands you run, and whether commands succeed or fail.

We don't use this anonymous information for anything other than to find out how we can make Truffle better and have also ensured that it doesn't make for a slower experience by sending this information in a background process.

To turn this feature on you can run

``` shell
truffle config --enable-analytics
```

If you want to turn the analytics off you can run

``` shell
truffle config --disable-analytics
```

<small>*P.S. feel free to go take a peek at the two places in the code where metrics are gathered: [when running a command](https://github.com/trufflesuite/truffle/blob/next/packages/truffle-core/lib/command.js#L114-L118) and [to report version and errors](https://github.com/trufflesuite/truffle/blob/next/packages/truffle-core/cli.js). If you go ahead and do a good ol' [GitHub search for the word `analytics`](https://github.com/search?q=analytics+repo%3Atrufflesuite%2Ftruffle&type=Code) you can verify that these are the only places this code gets invoked.* 🎉</small>

<a name="user-content-what-s-new-in-truffle-v5-new-truffle-config-more-to-come"></a>

#### More to come\!

In the future we plan on providing more infrastructure to make Truffle even more configurable\! Perhaps you could configure networks that will be used by multiple projects or something similar for plugin installation. Stay tuned\!

<a name="user-content-changelog-since-5-0-0-beta-2"></a>

## Changelog since 5.0.0-beta.2

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

The changes listed below only encompass the changes since v5.0.0-beta.2. See the release notes for [v5.0.0-beta.0](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.0), [v5.0.0-beta.1](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.1), and [v5.0.0-beta.2](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.2) for each release's changelog.

<a name="user-content-changelog-since-5-0-0-beta-2-new-features"></a>

#### New Features

  - [\#1445](https://github.com/trufflesuite/truffle/pull/1445) Support unboxing from github branches and into subdirectories. (@CruzMolina)
  - [\#1480](https://github.com/trufflesuite/truffle/pull/1480) Update CompilerSupplier to be able to handle solc version constraints. (@eggplantzzz)
  - [\#1490](https://github.com/trufflesuite/truffle/pull/1490) Network id check and verification during migrations. (@eggplantzzz)
  - [\#1500](https://github.com/trufflesuite/truffle/pull/1500) Add command to remove all debugger breakpoints. (@haltman-at)

<a name="user-content-changelog-since-5-0-0-beta-2-bug-fixes-improvements"></a>

#### Bug Fixes / Improvements

  - [\#1265](https://github.com/trufflesuite/truffle/pull/1265) Add module for easy decoding of TruffleContract objects. (@seesemichaelj)
  - [\#1424](https://github.com/trufflesuite/truffle/pull/1424) Reorganize the truffle-contract package. (@eggplantzzz)
  - [\#1453](https://github.com/trufflesuite/truffle/pull/1453) Update README.md. (@jtakalai)
  - [\#1460](https://github.com/trufflesuite/truffle/pull/1460) Tweak options for sane library to fix crashes. (@eggplantzzz)
  - [\#1462](https://github.com/trufflesuite/truffle/pull/1462) Fix `truffle help <command>` lag. (@CruzMolina)
  - [\#1465](https://github.com/trufflesuite/truffle/pull/1465) Upgrade test contracts to 0.5.0 and fix all resulting problems. (@haltman-at)
  - [\#1466](https://github.com/trufflesuite/truffle/pull/1466) Fix intermittent failures of variable ID tests by removing fixed source IDs. (@haltman-at)
  - [\#1467](https://github.com/trufflesuite/truffle/pull/1467) Fix BYOC/Solc Config Bug. (@CruzMolina)
  - [\#1468](https://github.com/trufflesuite/truffle/pull/1468) Keep precompiles from affecting function depth. (@haltman-at)
  - [\#1469](https://github.com/trufflesuite/truffle/pull/1469) Memoize `config.provider` to try and reuse providers. (@gnidan)
  - [\#1471](https://github.com/trufflesuite/truffle/pull/1471) Restructure and fix bug with `truffle unbox`. (@eggplantzzz)
  - [\#1476](https://github.com/trufflesuite/truffle/pull/1476) Suppress anonymous output parameters from `data.current.identifiers`. (@haltman-at)
  - [\#1479](https://github.com/trufflesuite/truffle/pull/1479) Add an integration test for init command. (@eggplantzzz)
  - [\#1481](https://github.com/trufflesuite/truffle/pull/1481) Add \!\<...\> syntax to debugger watch expressions. (@gnidan)
  - [\#1483](https://github.com/trufflesuite/truffle/pull/1483) Unabbreviate variable name for better style\! (@gnidan)
  - [\#1484](https://github.com/trufflesuite/truffle/pull/1484) Compartmentalize Assert.sol & Add Legacy SafeSend.sol. (@CruzMolina)
  - [\#1488](https://github.com/trufflesuite/truffle/pull/1488) Correct check for `undefined` and `null` in truffle config. (@eggplantzzz)
  - [\#1489](https://github.com/trufflesuite/truffle/pull/1489) Fix bug where contracts are incorrectly ignored. (@IIIIllllIIIIllllIIIIllllIIIIllllIIIIll)
  - [\#1493](https://github.com/trufflesuite/truffle/pull/1493) Function depth workaround conditional on using solc version \<0.5.1. (@haltman-at)
  - [\#1494](https://github.com/trufflesuite/truffle/pull/1494) Strip mapping metadata from decoder output in debugger. (@gnidan)
  - [\#1497](https://github.com/trufflesuite/truffle/pull/1497) Prevent the debugger reset command from being repeated with enter. (@haltman-at)
  - [\#1498](https://github.com/trufflesuite/truffle/pull/1498) Revert provider memoization introduced in [\#1469](https://github.com/trufflesuite/truffle/pull/1469). (@eggplantzzz)
  - [\#1503](https://github.com/trufflesuite/truffle/pull/1503) Fix reduce function error in CompilerSupplier. (@eggplantzzz)
  - [\#1510](https://github.com/trufflesuite/truffle/pull/1510) Vyper compiler output - handle both Windows and linux line endings. (@sgryphon)
  - [\#1519](https://github.com/trufflesuite/truffle/pull/1519) Handle asynchronous 3rd party plugins (2.0). (@daniyarchambylov & @CruzMolina)
  - [\#1520](https://github.com/trufflesuite/truffle/pull/1520) Add message to confirm that all breakpoints have been removed. (@haltman-at)
  - [\#1521](https://github.com/trufflesuite/truffle/pull/1521) Fix truffle-hdwallet-provider webpack config. (@CruzMolina)
  - [\#1522](https://github.com/trufflesuite/truffle/pull/1522) Refactor version utility methods and update version logging. (@eggplantzzz)
  - [\#1524](https://github.com/trufflesuite/truffle/pull/1524) Stop saving this.mnemonic in truffle-hdwallet-provider. (@gnidan)
  - [\#1526](https://github.com/trufflesuite/truffle/pull/1526) Update tests for unboxing. (@eggplantzzz)
  - [\#1528](https://github.com/trufflesuite/truffle/pull/1528) Fix bug with the network id check during migrations. (@eggplantzzz)
  - [\#1529](https://github.com/trufflesuite/truffle/pull/1529) Fix bug with CompilerSupplier method. (@eggplantzzz)
  - [\#1537](https://github.com/trufflesuite/truffle/pull/1537) Use stringification which can handle `null` when reporting logs. (@coventry)
  - [\#1539](https://github.com/trufflesuite/truffle/pull/1539) Fix bug with `truffle version`. (@eggplantzzz)
  - [\#1542](https://github.com/trufflesuite/truffle/pull/1542) Update help for test command. (@eggplantzzz)
  - [\#1547](https://github.com/trufflesuite/truffle/pull/1547) Stabilize options.solc. (@CruzMolina)

<a name="user-content-changelog-since-5-0-0-beta-2-dependency-updates"></a>

#### Dependency Updates

  - [\#1464](https://github.com/trufflesuite/truffle/pull/1426) Add configstore dependency to truffle-config package.json. (@seesemichaelj)
  - [\#1492](https://github.com/trufflesuite/truffle/pull/1492) Upgrade ganache-core & ganache-cli to latest versions. (@CruzMolina)
  - [\#1495](https://github.com/trufflesuite/truffle/pull/1495) Temporarily use Truffle Web3 fork. (@eggplantzzz)
  - [\#1513](https://github.com/trufflesuite/truffle/pull/1513) Use beta 37 version of Web3. (@eggplantzzz)
  - [\#1515](https://github.com/trufflesuite/truffle/pull/1515) Homogenize package dependencies. (@gnidan)
  - [\#1525](https://github.com/trufflesuite/truffle/pull/1525) Add missing app-module-path dependency. (@CruzMolina)
  - [\#1530](https://github.com/trufflesuite/truffle/pull/1530) Specify solc v0.5.0 for Truffle. (@CruzMolina)
  - [\#1548](https://github.com/trufflesuite/truffle/pull/1548) Add dev dependencies for truffle-hdwallet-provider. (@CruzMolina)

<a name="user-content-acknowledgments"></a>

## Acknowledgments

<sup>\[ [∧](#user-content-contents) *Back to contents* \]</sup>

This release has been a long time in the making and represents months of hard work by many contributors, both internal and external. Without your care and service, there would be no Truffle v5, and so we would like to extend our gratitude for helping bring us here today.

First of all, many thanks to Truffle's core engineering team: @eggplantzzz, @haltman-at, @CruzMolina, and @fainashalts. You have ignited this project's development and fuel this fire every day. We are grateful to receive your energy, your intellect, and your adept response to the daily challenges of software development.

Beyond just the core engineering team, Truffle owes its thanks to everyone in the broader Truffle organization. The operational support you provide is what enables this project to function. A special note of deep admiration to Truffle engineer alumnus @cgewecke, whose tireless efforts led to the first v5 beta that provide the bedrock of this release. And of course, thank you @tcoulter for bringing this project together and leading through vision and execution.

To members of the [Colony](https://colony.io/) team, your support has resonated loudly. You are surely already aware of the impact of your efforts, but to express our sentiments here: you have been crucial to our developing confidence in our work. Thank you @elenadimitrova and the rest of the team for being early adopters and for the countless hours of investigation into problems along the way.

Humble thanks to members of the [Solidity](https://solidity.readthedocs.io) and [Web3.js](https://web3js.readthedocs.io) teams. You are the giants upon whose shoulders we stand. Beyond providing the foundational software that Truffle incorporates, special thanks to @axic and @chriseth for the insights you have provided, and to @frozeman and @nivida for going above-and-beyond in helping us address some last minute issues we discovered.

Of course, these few names are just a tiny subset of Truffle's community. To all of our contributors, to those of you who have raised your hand in our [Gitter](https://gitter.im/ConsenSys/truffle) when something was unclear, to those of you who have opened issues, or gone a step further and written pull requests, to every Truffle user— you are why and for whom we build Truffle. Thank you.

-----

<p align="center">
:coffee:
</p>

-----
