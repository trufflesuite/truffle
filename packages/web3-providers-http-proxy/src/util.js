module.exports = {
  emptyFn: origin => origin,

  defaultAdaptor: function(_payload) {
    return origin => origin;
  },

  numToHex: num => `0x${num.toString(16)}`
};
