module.exports = function (deployer) {
  deployer
    .then(function () {
      return Promise.reject("This first migration step just fails.");
    })
    .then(function () {
      console.log("First migration step appears to have succeeded.");
    })
    .catch(function (err) {
      console.log("Error in migration:", err);
    });
};
