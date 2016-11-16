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
  <p>Please visit the <a href="http://truffleframework.com/docs/advanced/commands">page on the new documentation site</a> for up to date information.</p>
</section>

# Usage

```none
$ truffle [command] [options]
```

# Available Commands

##### build

Build a development version of the app; creates the `./build` directory.

```none
$ truffle build
```

Optional parameters:

* `--dist`: Build a distributable version of the app. Only applicable when using the default builder.

See the [Building your application](/getting_started/build) section for more details.

##### console

Run a console with your contract objects instantiated and ready to use.

```none
$ truffle console
```

Once the console starts, you can then use your contracts via the command line like you would in your code. Additionally, all truffle commands listed here are available within the console.

Optional parameters:

* `--network name`: Specify the network to use.
* `--verbose-rpc`: Log communication between Truffle and the RPC.

See the [Using the console](/getting_started/console) section for more details.

##### compile

Intelligently compile your contracts. This will only compile contracts that have changed since the last compile, unless otherwise specified.

```none
$ truffle compile
```

Optional parameter:

* `--compile-all`: Compile all contracts instead of intelligently choosing.
* `--network name`: Specify the network to use, saving artifacts specific to that network.

##### create:contract

Helper method to scaffold a new contract. Name must be camel-case.

```none
$ truffle create:contract MyContract
```

##### create:test

Helper method to scaffold a new test for a contract. Name must be camel-case.

```none
$ truffle create:test MyTest
```

##### migrate

Run your project's migrations. See the [Migrations](/getting_started/migrations) section for more details.

```none
$ truffle migrate
```

Optional parameters:

* `--reset`: Run all migrations from the beginning, instead of running from the last completed migration.
* `--network name`: Specify the network to use, saving artifacts specific to that network.
* `--to number`: Migrate from the current migration to the migration specified in `to`.
* `--compile-all`: Compile all contracts instead of intelligently choosing.
* `--verbose-rpc`: Log communication between Truffle and the RPC.

##### exec

Execute a Javascript file within the Truffle environment. This will include `web3`, set the default provider based on the network specified (if any), and include your contracts as global objects while executing the script. Your script must export a function that Truffle can run. See the [Writing external scripts](/getting_started/scripts) section for more details.

```none
$ truffle exec /path/to/my/script.js
```

Optional parameter:

* `--network name`: Specify the network to use, using artifacts specific to that network.

##### init

Create a completely new app within the current working directory. Will add default contracts, tests and frontend configuration.

```none
$ truffle init
```

##### list

List all available commands and exit. Synonymous with `--help`.

```none
$ truffle list
```

##### serve

Serve the built app from `http://localhost:8080`, rebuilding and redeploying changes as needed. Like `truffle watch`, but with the web server component added.

```none
$ truffle serve
```

Optional parameters:

* `-p port`: Specify the port to serve on. Default is 8080.
* `--network name`: Specify the network to use, using artifacts specific to that network.

##### test

Run all tests within the `./test` directory, or optionally run a single test.

```none
$ truffle test [/path/to/test/file]
```

Optional parameters:

* `--compile-all`: Compile all contracts instead of intelligently choosing.
* `--verbose-rpc`: Log communication between Truffle and the RPC.
* `--network name`: Specify the network to use, using artifacts specific to that network.

##### version

Show version number and exit.

```none
$ truffle version
```

##### watch

Watch for changes to contracts, app and configuration files. When there's a change, rebuild the app if necessary.

```none
$ truffle watch
```

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
