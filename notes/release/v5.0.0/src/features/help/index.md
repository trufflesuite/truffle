Truffle now has a help system on board!  Want to figure out what commands are available?  Simply run `truffle help`.  Want to figure out usage information for a command and what options are available?  Run `truffle help <command>`.

```
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
```
