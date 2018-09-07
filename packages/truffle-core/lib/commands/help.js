var command = {
  command: 'help',
  description: 'Display information about given command.',
  optionsDescriptions: {

  },
  builder: {},
  run: function (options) {
    var commands = require('./index');
    console.log('You have run the help command.');
    console.log('The options you have provided are --> ' + JSON.stringify(options));
  }
}

module.exports = command;
