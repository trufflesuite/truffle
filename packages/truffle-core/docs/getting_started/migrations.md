Migrations are Javascript files that help you deploy contracts to the Ethereum network. These files are responsible for staging your deployment tasks, and they're written under the assumption that your deployment needs will change over time. As your project evolves, you'll create new migration scripts to further this evolution on the blockchain. A history of previously run migrations is recorded on-chain through a special `Migrations` contract, detailed below.

# Command

To run your migrations, run the following:

```none
$ truffle migrate
```

This will run all migrations located within your project's `migrations` directory. If your migrations were previously run successfully, `truffle migrate` will start execution from the last migration that was ran, running only newly created migrations. If no new migrations exists, `truffle migrate` won't perform any action at all. You can use the `--reset` option to run all your migrations from the beginning.

# Migration Files

A simple migration file looks like this:

Filename: 4_example_migration.js

```javascript
module.exports = function(deployer) {
  // deployment steps
  deployer.deploy(MyContract);
};
```

Note that the filename is prefixed with a number and is suffixed by a description. The numbered prefix is required in order to record whether the migration ran successfully. The suffix is purely for human readability and comprehension.

The function exported by each migration accepts a `deployer` object as a first parameter. This object aides in deployment by both providing a clear syntax as well as performing some of the more mundane duties of contract deployments, such as saving deployed artifacts for later use. The `deployer` object is your main interface for staging deployment tasks, and its API is described at the bottom of this page.

Like all code within Truffle, your [contract abstractions](/getting_started/contracts/) are provided and initialized for you so you can easily interact with the Ethereum network. These abstractions are an integral part of the deployment process, as you'll see below.

# Initial Migration

Truffle requires you to have a Migrations contract in order to use the Migrations feature. This contract must contain a specific interface, but you're free to edit this contract at will. For most projects, this contract will be deployed initially as the first migration and won't be updated again. You will also receive this contract by default when creating a new project with `truffle init`.

Filename: contracts/Migrations.sol

```
contract Migrations {
  address public owner;

  // A function with the signature `last_completed_migration()`, returning a uint, is required.
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _
  }

  function Migrations() {
    owner = msg.sender;
  }

  // A function with the signature `setCompleted(uint)` is required.
  function setCompleted(uint completed) restricted {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) restricted {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
```

You must deploy this contract inside your first migration in order to take advantage of the Migrations feature. To do so, create the following migration:

Filename: migrations/1_initial_migration.js

```javascript
module.exports = function(deployer) {
  // Deploy the Migrations contract as our only task
  deployer.deploy(Migrations);
};
```

From here, you can create new migrations with increasing numbered prefixes to deploy other contracts and perform further deployment steps.

# Deployer

Your migration files will use the deployer to stage deployment tasks. As such, you can write deployment tasks synchronously and they'll be executed in the correct order:

```javascript
// Stage deploying A before B
deployer.deploy(A);
deployer.deploy(B);
```

Alternatively, each function on the deployer can be used as a Promise, to queue up deployment tasks that depend on the execution of the previous task:

```javascript
// Deploy A, then deploy B, passing in A's newly deployed address
deployer.deploy(A).then(function() {
  return deployer.deploy(B, A.address);
});
```

It is possible to write your deployment as a single promise chain if you find that syntax to be more clear. The deployer API is discussed at the bottom of this page.

# Network Considerations

It is possible to run deployment steps conditionally based on the network being deployed to. This is an advanced feature, so see the [Networks](/advanced/networks) section first before continuing.

To conditionally stage deployment steps, write your migrations so that they accept a second parameter, called `network`. Example:

```javascript
module.exports = function(deployer, network) {
  // Add demo data if we're not deploying to the live network.
  if (network != "live") {
    deployer.exec("add_demo_data.js");
  }
}
```

# Deployer API

The deployer contains many functions available to simplify your migrations.

##### deployer.deploy(contract, args...)

Deploy a specific contract, specified by the contract object, with optional constructor arguments. This is useful for singleton contracts, such that only one instance of this contract exists for your dapp. This will set the address of the contract after deployment (i.e., `Contract.address` will equal the newly deployed address), and it will override any previous address stored.

You can optionally pass an array of contracts, or an array of arrays, to speed up deployment of multiple contracts.

Note that `deploy` will automatically link any required libraries to the contracts that are being deployed, if the addresses for those libraries are available. You *must* deploy your libraries first before deploying a contract that depends on one of those libraries.

Examples:

```javascript
// Deploy a single contract without constructor arguments
deployer.deploy(A);

// Deploy a single contract with constructor arguments
deployer.deploy(A, arg1, arg2, ...);

// Deploy multiple contracts, some with arguments and some without.
// This is quicker than writing three `deployer.deploy()` statements as the deployer
// can perform the deployment as a batched request.
deployer.deploy([
  [A, arg1, arg2, ...],
  B,
  [C, arg1]
]);
```

##### deployer.link(library, destinations)

Link an already-deployed library to a contract or multiple contracts. `destinations` can be a single contract or an array of multiple contracts. If any contract within the destination doesn't rely on the library being linked, the deployer will ignore that contract.

This is useful for contracts that you *don't* intend to deploy (i.e. are not singletons) yet will need linking before being used in your dapp.

Example:

```javascript
// Deploy library LibA, then link LibA to contract B
deployer.deploy(LibA);
deployer.link(LibA, B);

// Link LibA to many contracts
deployer.link(LibA, [B, C, D]);
```

##### deployer.autolink(contract)

Link all libraries that `contract` depends on to that contract. This requires that all libraries `contract` depends on have already been deployed or were queued for deployment in a previous step.

Example:

```javascript
// Assume A depends on a LibB and LibC
deployer.deploy([LibB, LibC]);
deployer.autolink(A);
```

Alternatively, you can call `autolink()` without a first parameter. This will link all libraries available to the contracts that depend on them. Ensure your libraries are deployed first before calling this function.

Example:

```javascript
// Link *all* libraries to all available contracts
deployer.autolink();
```

##### deployer.then(function() {...})

Just like a promise, run an arbitrary deployment step.

Example:

```javascript
deployer.then(function() {
  // Create a new version of A
  return A.new();
}).then(function(instance) {
  // Set the new instance of A's address on B.
  var b = B.deployed();
  return b.setA(instance.address);
});
```

##### deployer.exec(pathToFile)

Execute a file meant to be run with `truffle exec` as part of the deployment. See the [Writing external scripts](/getting_started/scripts/) section for more information.

Example:

```javascript
// Run the script, relative to the migrations file.
deployer.exec("../path/to/file/demo_data.js");
```

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
