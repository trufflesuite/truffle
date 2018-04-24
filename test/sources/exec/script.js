const Executable = artifacts.require('Executable');

const exec = function(){
  Executable
    .new()
    .then(instance => instance.x())
    .then(val => console.log(parseInt(val)));
}

module.exports = exec;