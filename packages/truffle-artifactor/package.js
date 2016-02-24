/* jshint ignore:start */
Package.describe({
  name: 'tcoulter:meteor-ether-pudding',
  version: '0.0.1',
  summary: 'Pudding - a (more) delightful contract abstraction, based on web3',
  git: 'https://github.com/consensys/ether-pudding',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.2');
  api.use('mvrx:bluebird@0.0.1', 'client');

  api.export(['Pudding'], ['client']);

  api.add_files('dist/ether-pudding.js', 'client');
  api.add_files('package-init.js', 'client');
});
