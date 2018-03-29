var tmp = require('tmp');
var fs = require('fs-extra');
var config = require('truffle-config');
var path = require('path');

module.exports = {

  copyDirectory: function(source, dest) {
    return new Promise(function(accept, reject) {
      fs.copy(source, dest, function(err) {
        (err) ? reject(err) : accept();
      });
    });
  },

  create: function(source){
    var self = this;

    return new Promise((resolve, reject) => {
      if (!fs.existsSync(source)){
        return reject("Sandbox failed: source: " + source + " does not exist");
      }

      tmp.dir((err, dir) => {
        if(err) return reject(err);

        self.copyDirectory(source, dir)
          .then(() => {
            var conf = config.load(path.join(dir, "truffle.js"), {});
            resolve(conf);
          })
          .catch(reject);
      })
    });
  }
}
