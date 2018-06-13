<style>
  .DocumentationWarning {
    text-align: center;
    padding: 1rem;
    background:rgb(255, 101, 52);
  }

  .DocumentationWarning a {
    color: white;
  }
</style>
<section class="DocumentationWarning">
  <h1>These documents are out of date</h1>
  <p>Please visit the <a href="http://truffleframework.com/docs/getting_started/testing">page on the new documentation site</a> for up to date information.</p>
</section>

# Framework

Truffle uses the [Mocha](https://mochajs.org/) testing framework for automated testing and [Chai](http://chaijs.com/) for assertions. We think these two libraries together make automated testing a breeze, and so we've built on top of them to provide you a way to write simple and manageable automated tests for your contracts.

# Location

All test files should be located in the `./tests` directory. Truffle will only run test files with the following file extensions: `.js`, `.es`, `.es6`, and `.jsx`. All other files are ignored.

# Writing Tests

Each test file should contain at least one call to Mocha's `describe()` function as shown in the [MochaJS Documentation](https://mochajs.org/). Alternatively, you can use Truffle's custom `contract()` function which works like Mocha's `describe()` but with a few added features:

* Before each `contract()` function is run, your contracts are redeployed to the running Ethereum client so the tests within it run with a clean contract state.
* The `contract()` function provides a list of available accounts as a second parameter with which you can write tests against.

Use the `contract()` function when you're writing tests that interact with your contracts. Use `describe()` when you're writing tests that don't interact with any contracts.

# Example Test

Here's an example test provided for you by `truffle init`. This will tell Truffle (and Mocha) to deploy your contracts first and then run the test specified in the `it()` block.

```javascript
contract('MetaCoin', function(accounts) {
  it("should put 10000 MetaCoin in the first account", function() {
    // Get a reference to the deployed MetaCoin contract, as a JS object.
    var meta = MetaCoin.deployed();

    // Get the MetaCoin balance of the first account and assert that it's 10000.
    return meta.getBalance.call(accounts[0]).then(function(balance) {
      assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
    });
  });
});
```

Note that the string `'MetaCoin'` passed to the `contract()` function is for display purposes only.

# Contracts

Truffle provides a contract abstraction for you that makes interacting with your contracts easy. You can see this abstraction at work within the `var meta = MetaCoin.deployed()` line of code. Truffle ensures that interacting with contracts within your tests is the same as interacting with contracts within your frontend and within your migrations, and you can read more about [that interaction](/getting_started/contracts) in the next section.

# Command

To run all tests, simply run:

```
$ truffle test
```

Alternatively, you can specify a path to a specific file you want to run, e.g.,

```none
$ truffle test ./path/to/test/file.js
```

# Considerations

The [EthereumJS TestRPC](https://github.com/ethereumjs/testrpc) is significantly faster than other clients when running automated tests. Moreover, the TestRPC contains special features which Truffle takes advantage of to speed up test runtime even more. As a general workflow, we recommend you use the TestRPC during normal development and testing, and then run your tests once against Geth or another official Ethereum client when you're gearing up to deploy to the live network.

# Advanced

Truffle gives you access to Mocha's configuration so you can change how Mocha behaves. See the [project configuration](/advanced/configuration/#mocha) section for more details.

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
