var migrate = require("./migrate");

var command = {
  command: 'deploy',
  description: '(alias for migrate)',
  builder: migrate.builder,
  run: migrate.run
}

module.exports = command;
