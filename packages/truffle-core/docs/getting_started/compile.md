# Location

All of your contracts are located in the `./contracts` directory. By default you're given an example Solidity [contract](http://solidity.readthedocs.org/en/latest/contracts.html) file and an example Solidity [library](http://solidity.readthedocs.org/en/latest/contracts.html#libraries) file, both with filenames ending in `.sol`. Although a Solidity library is different than a contract, for documentation purposes we're going to lump these into the same word, "contracts".

# Command

To compile your contracts, simply run:

```none
$ truffle compile
```

Truffle will compile only the contracts that have been changed since the last compile, to reduce any unnecessarily compilation. If you'd like to override this behavior, run the above command with the `--compile-all` option.

# Convention

Truffle expects your contract files to define contracts that match their filenames *exactly*. For instance, if you have a file called `MyContract.sol`, one of the following should exist within the contract file:

```
contract MyContract {
  ...
}
// or
library MyContract {
  ...
}
```

Filename matching is case-sensitive, meaning if your filename isn't capitalized, your contract name shouldn't be capitalized either. We recommend capitalizing every word, however, like above.

# Dependencies

You can declare contract dependencies using Solidity's [import](http://solidity.readthedocs.org/en/latest/layout-of-source-files.html#importing-other-source-files) command. Truffle will compile contracts in the correct order and link libraries automatically when necessary.

# Artifacts

Artifacts of your compilation will be place in the `./build/contracts` directory, relative to your project. This directory will be created if it does not exist. These artifacts are integral to the inner workings of Truffle, and they play and important part to the successful deployment of your application. You should not edit these files by hand as they'll be overwritten by contract compilation and deployment.

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
