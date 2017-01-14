'use strict';

let asyncTask = function() {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(45);
    }, 1000);
  });
};

var fn = function* () {
  var h = yield asyncTask();

  console.log("--->", h);

  yield h;
};

var done = false;
var value = null;
let iterator = fn();
let loop = function(result) {
  return result.value.then(function(res) {
    console.log("--->", res);

    done = true;
    if (done) {
      loop(res);
    } else {
      loop(iterator.next());
    }
  });
};

loop(iterator.next());


console.log("asdfasd", iterator.next());
