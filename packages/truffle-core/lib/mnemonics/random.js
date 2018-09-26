module.exports = {
  // Mimics crypto.random bytes, but takes in a random number generator
  // as its second parameter. rng is expected to be a function that takes
  // no parameters and returns a result like Math.random().
  // This is important because it allows for a seeded random number generator.
  // Since this is a mock RPC library, the rng doesn't need to be cryptographically secure.
  randomBytes: function(length, rng) {
    var buf = [];

    for (var i = 0; i < length; i++) {
      buf.push(rng()*255);
    }

    return Buffer.from(buf);
  },

  randomAlphaNumericString: function(length, rng) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let text = '';

    for (var i = 0; i < length; i++) {
      text += alphabet.charAt(Math.floor((rng || Math.random)() * alphabet.length));
    }

    return text;
  }

}
