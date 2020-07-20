// convert an async function to one that maybe takes a callback
function polycallbackify({
  asyncFunction,
  determineArgs = (options, callback) => ({
    args: [options],
    callback
  }),
  resultArgs = result => [result]
}) {
  return async (...rawArgs) => {
    const { args, callback } = determineArgs(...rawArgs);

    try {
      const result = await asyncFunction(...args);

      if (callback) {
        callback(null, ...resultArgs(result));
      } else {
        return result;
      }
    } catch (error) {
      if (callback) {
        callback(error);
      } else {
        throw error;
      }
    }
  };
}

module.exports = { polycallbackify };
