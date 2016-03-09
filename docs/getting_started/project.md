# Create a Project Folder

First create a project folder. You can do this through your favorite file explorer or by running the following on the command line:

```none
$ mkdir myproject
```

# Initialize Your Project

Next, initialize your Truffle project by performing the following in the command line:

```none
$ cd myproject
$ truffle init
```

Once completed, you'll now have a project structure with the following items:

* `app/` - directory where your application files go by default. This includes recommended folders for Javascript files and stylesheets, but you have free reign over how this folder is used.
* `contracts/` - directory where Truffle expects to find solidity contracts.
* `environments/` - directory where built application artifacts are placed, and where you can override configuration variables per-environment.
* `test/` - location of test files for testing your application and contracts.
* `truffle.js` - your main Truffle configuration file.

# Default Project: MetaCoin

By default, `truffle init` gives you a demo application called MetaCoin which acts like an alt-coin built inside Ethereum. You can use this project to learn quickly while navigating through the Getting Started guide, or delete these files and build a project of your own.
