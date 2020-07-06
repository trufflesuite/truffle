module.exports = {
  emptyFn: origin => origin,

  defaultAdaptor: _payload => this.emptyFn,

  numToHex: num => `0x${num.toString(16)}`
};
