#### Unique `truffle develop` mnemonics
When you run `truffle develop`, Truffle no longer uses the classic `candy maple...` mnemonic.  Instead, the first time you run the command it will generate a random mnemonic just for you and persist it!

We encourage you to exercise caution when working with mnemonics and private keys, and recommend that everyone do their own research when it comes to protecting their crypto security.

#### Opt-in Analytics
To try and obtain more information about how we can improve Truffle, we have added an optional new analytics feature.  By default it is turned off but if you enable it, the Truffle developers will receive anonymous information about your version number, the commands you run, and whether commands succeed or fail.

We don't use this anonymous information for anything other than to find out how we can make Truffle better and have also ensured that it doesn't make for a slower experience by sending this information in a background process.

To toggle this feature you can run `truffle config <--enable-analytics|--disable-analytics>`.

#### More to come!
In the future we plan on providing more infrastructure to make Truffle even more configurable!  Perhaps you could configure networks that will be used by multiple projects or something similar for plugin installation.  Stay tuned!
