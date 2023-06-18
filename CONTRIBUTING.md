# Introduction and prerequisites

Truffle uses lerna to manage multi-package repositories. Each Truffle module is defined in its own npm package in the `packages/` directory.

The entry point of these modules is `@truffle/core`. This is where the command line parser is setup.

Install lerna:

```shell
$ npm install -g lerna
$ npm install -g yarn
```

# The command flow

The heart of Truffle lies in the `@truffle/core` package. Whenever a command
is run, `packages/core/cli.js` gets run with everything following `truffle`
(on the command line) being passed in as arguments. In other words, if you run
`truffle migrate --network myNetwork`, then `packages/core/cli.js` gets run
with "`migrate`" and "`--network myNetwork`" as arguments.

Throughout the course of running `packages/core/cli.js`, Truffle parses out what
commands and options the user has provided, instantiates an instance of the
`Command` class, and calls the `run` method on that instance. The `run` method
is the interface that `cli.js` uses for ALL commands. You can find all of the
specific command files (one file for each command) at
`packages/core/lib/commands`. From the run method of each command you should be
able to trace the command lifecycle to libraries and modules in `@truffle/core`
as well as other packages in the monorepo.

# Add a new command in truffle

### Create a new lerna package

```shell
$ lerna create mycmd
```

### Add the package to `@truffle/core`

```shell
$ lerna add mycmd --scope=@truffle/core
```

### Create a new command in `@truffle/core`

1. Create a new directory in `packages/core/lib/commands/`, let's call it `mycmd`.
2. Create 3 javascript files inside the **mycmd** directory with the filenames **run.js**, **meta.js** and **index.js**:  
    * **run.js** contains the entry function after a user calls your command.
    * **meta.js** contains information such as command name and command description. 
    * **index.js** exports both the run module and the meta module. 

#### run.js
```shell
$ cat << EOF > core/lib/commands/mycmd/run.js

module.exports = async function (options){
  const mycmd = require("mycmd");
  // TODO: write the run command here, something like:
  // mycmd(options)
};
EOF
```
#### meta.js
```shell
$ cat << EOF > core/lib/commands/mycmd/meta.js
module.exports = {
  command: "mycmd",
  description: "Run mycmd",
  builder: {},
  help: {
    usage: "truffle mycmd",
    options: []
  }
EOF
```
#### index.js
```shell
$ cat << EOF > core/lib/commands/mycmd/index.js
module.exports = {
  run: require("./run"),
  meta: require("./meta")
};
EOF
```

### Link it from the commands/index.js file

```diff
--- packages/core/lib/commands/index.js
+++ packages/core/lib/commands/index.js
@@ -1,4 +1,5 @@
 module.exports = {
+  mycmd: require("./mycmd"),
```

### Link it from the commands/commands.js file

```diff
--- packages/core/lib/commands/commands.js
+++ packages/core/lib/commands/commands.js
@@ -1,4 +1,5 @@
 module.exports = [
+  "mycmd",
```

From there, you should see it in the help screen:
```shell
$ cd packages/core
$ node cli.js
Truffle v5.0.0-beta.1 - a development framework for Ethereum

Usage: truffle <command> [options]

Commands:
  mycmd     Run mycmd
  build     Execute build pipeline (if configuration present)
[...]
```

### Write your module/command

The setup is done, you can now write your command and organize your module as you want in: `packages/mycmd/`. You can have a look at `packages/box/` which is a good starting example to follow.

### Execute the command
```shell
$ cd packages/core
$ node cli.js mycmd
```
