// We try to avoid request at all costs because it doesn't bundle well.
// There are a few places I couldn't solve, so I put this shim here to
// tell me where they were during runtime. Eventually, we need to make a
// request => axios shim. Should be easy, but potentially time consuming.
module.exports = {
  get: function() {
    throw new Error("request.get() not properly shimmed yet");
  },

  post: function() {
    throw new Error("request.post() not properly shimmed yet");
  }
};
