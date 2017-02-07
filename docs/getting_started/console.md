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
  <p>Please visit the <a href="http://truffleframework.com/docs/getting_started/console">page on the new documentation site</a> for up to date information.</p>
</section>

# Background

Sometimes it's nice to work with your contracts interactively for testing and debugging purposes, or for executing transactions by hand. Truffle provides you an easy way to do this via an interactive console, with your contracts available and ready to use.

# Command

To fire up the console, simply run:

```none
$ truffle console
```

This will load up a console using the default network, connecting automatically to the running Ethereum client. You can override this using the `--network` option. See more details in the [Networks](/advanced/networks) section as well as the [command reference](/advanced/commands).

When you load the console, you'll immediately see output like this:

```
$ truffle console
truffle(default)>
```

This tells you you're running within a Truffle console using the default network.

# Features

The console provides all the features available in the Truffle command line tool. For instance, you can type `migrate --reset` within the console, and it will be interpreted the same as if you ran `truffle migrate --reset` from outside the console. Truffle's console additionally has the following features:

* All of your compiled contracts are available and ready for use, as if you were developing tests or your frontend, or writing a migration.
* After each command (such as `migrate --reset`) your contracts are reprovisioned so you can start using the newly assigned addresses and binaries immediately.
* The `web3` library is made available and is set to connect to your Ethereum client.
* All commands that return a promise will automatically be resolved, and the result printed, removing the need to use `.then()` for simple commands. e.g.,

```
truffle(default)> MyContract.deployed().getValue.call(); //
5
```

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
