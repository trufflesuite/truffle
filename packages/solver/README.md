# `@truffle/solver`

Utility for taking declarative deployment `yaml` files, creating imperative lists of commands from them, sending those commands to Truffle, and handling the responses. This package seeks to be the glue between declarative deployments and the rest of the Truffle codebase.

## Usage

Create a declarative yaml file for your project's deployment and then run the following command in the command line:

`truffle deploy <name-of-file>`
