// var Require = require("truffle-exec");
// var path = require("path");
//
// module.exports = function(file, deployer) {
//   return function() {
//     if (path.isAbsolute(file) == false) {
//       file = path.resolve(path.join(deployer.basePath, file));
//     }
//
//     deployer.logger.log("Running " + file + "...");
//     // Evaluate any arguments if they're promises
//     return new Promise(function(accept, reject) {
//       Require.exec({
//         file: file,
//         contracts: Object.keys(deployer.known_contracts).map(function(key) {
//           return deployer.known_contracts[key];
//         }),
//         network: deployer.network,
//         network_id: deployer.network_id,
//         provider: deployer.provider
//       }, function(err) {
//         if (err) return reject(err);
//         accept();
//       });
//     });
//   };
// };
