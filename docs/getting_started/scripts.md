# Background

Often you may want to run external scripts that interact with your contracts. Truffle provides an easy way to do this, bootstrapping your contracts based on your environment and connecting to your Ethereum client automatically per your [project configuration](/advanced/configuration).

# Command

Truffle provides two ways of executing external scripts. One is through the `truffle` command, as shown:

```
$ truffle exec <path/to/file.js>
```

This can be burdensome in rare cases, however, and so Truffle provides a standalone executable for running external scripts:

```
$ truffle-exec <path/to/file.js>
```

Both commands are equivalent and function the same.

# Caveat

Although your scripts are run like normal Javascript files with a few objects made available on the global scope (like your contracts), there is one large caveat:

* Due to implementation details, if you want your script to end you **must** call `process.exit()`. Your script **will not end** unless `process.exit()` is called.

You can call `process.exit()` with a non-zero exit code to tell Truffle that your script ran unsuccessfully. This is important to the [after_deploy](/advanced/configuration/#after_deploy) configuration option, for instance, as you don't want the script runner to continue if it encounters an error.
