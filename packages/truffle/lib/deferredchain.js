function DeferredChain() {
  var self = this;
  this.chain = new Promise(function(accept, reject) {
    self._accept = accept;
    self._reject = reject;
  });

  this.await = new Promise(function() {
    self._done = arguments[0];
    self._error = arguments[1];
  });
  this.started = false;
};

DeferredChain.prototype.then = function(fn) {
  var self = this;
  this.chain = this.chain.then(function() {
    var args = Array.prototype.slice.call(arguments);

    return fn.apply(null, args);
  });
  this.chain = this.chain.catch(function(e) {
    self._error(e);
  });

  return this;
};

DeferredChain.prototype.catch = function(fn) {
  var self = this;
  this.chain = this.chain.catch(function() {
    var args = Array.prototype.slice.call(arguments);

    return fn.apply(null, args);
  });

  return this;
};

DeferredChain.prototype.start = function() {
  this.started = true;
  this.chain = this.chain.then(this._done);
  this._accept();
  return this.await;
};

module.exports = DeferredChain;
