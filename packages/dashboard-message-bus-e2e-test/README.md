# `@truffle/dashboard-message-bus-client`

This is a private package that's used to run e2e tests of `@truffle/dashboard-message-bus` and
`@truffle-dashboard-message-bus-client`.

Having these tests in a separate (unpublished) package makes it so that we can test both the message bus and client
without having a circular dependency.

## Testing

All tests are located in the `test` directory. To run tests, simply run `yarn test`.

```

```
