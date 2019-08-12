// Make ora just output its text to the console.
class Spinner {
  constructor(options) {
    this.options = options;
  }

  start() {
    console.log(this.options.text);
    return this;
  }

  stop() {
    // noop.
    return this;
  }
}

module.exports = function(options) {
  return new Spinner(options);
};
