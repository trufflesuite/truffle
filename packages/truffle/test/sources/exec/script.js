const Executable = artifacts.require('Executable');

const exec = function(){
  Executable
    .new()
    .then(instance => instance.x())
    .then(val => {
      console.log(parseInt(val));
      process.exit(0);
    })
    .catch(err => process.exit(1));
}

module.exports = exec;