### init / unbox

There have been some changes made to the `init` and `unbox` commands.

To avoid accidentally overwriting files, in the past Truffle would not allow you to unbox or init in a directory that was not empty.  With version 5, Truffle allows you to do so.  When it finds files that have name conflicts with the files being copied, it will prompt you for each conflict and ask if you want to overwrite the existing files!

If you don't want to deal with the prompts and know what you are doing, you can now also just bypass the prompting stage.  You can do this by using a `--force` option.  If you use this option, Truffle automatically overwrites any files that have name conflicts with the files being copied.  Make sure you are careful when using this option so you don't overwrite anything you want to keep!

One last thing that has been changed with these commands is the ability to unbox from a branch or subdirectory.  Now you can unbox projects in the following formats:
```shell
truffle unbox https://github.com/truffle-box/bare-box#remote-branch-on-github
truffle unbox git@github.com:truffle-box/bare-box#web3-one:directory/subDirectory
```
