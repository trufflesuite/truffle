# Truffle

Truffle is a development environment, testing framework and asset pipeline for Ethereum. Truffle shares many similarities to the [Embark Framework](https://iurimatias.github.io/embark-framework/) but differs in philosophy. The main development goals of Truffle are: 

### Flat Files

Ethereum provides a rich new landscape for deploying distributed applications and associated assets, some new, some old. Truffle aims to support all of them by not relying on any server and instead compiling everything down to flat files.

### Single-Page Apps

Though not specifically required, Ethereum and the Truffle framework lend themselves nicely to single-page app development.

### Everything is RPC

The application and tests all run on the RPC, using the same code to communicate with every RPC client. This gives you assurance your app will work for your users, and the ability to test it across many different clients without writing a drop of new code.

### No Stubbing

Truffle tests interact with *real* contracts on *real* RPC clients. Contracts aren’t stubbed, so you know you’re getting real results.

