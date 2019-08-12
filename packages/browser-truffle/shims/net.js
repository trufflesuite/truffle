// net is not supported in the browser. But let's error cleanly if it's ever used.
module.exports = {
  createConnection: function() {
    throw new Error("net not supported");
  }
};
