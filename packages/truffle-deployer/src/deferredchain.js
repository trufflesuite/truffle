class DeferredChain {
  constructor(){
    const self = this;

    this.chain = new Promise(function(accept, reject){
      self._accept = accept;
      self._reject = reject;
    });

    this.await = new Promise(function(){
      self._done = arguments[0];
      self._error = arguments[1];
    });

    this.started = false;
  }

  then(fn){
    this.chain = this.chain.then(() => {
      var args = Array.prototype.slice.call(arguments);
      return fn.apply(null, args);
    });

    this.chain = this.chain.catch(e => this._error(e));
    return this;
  }

  catch(fn){
    this.chain = this.chain.catch(() => {
      var args = Array.prototype.slice.call(arguments);
      return fn.apply(null, args);
    });

    return this;
  }

  start(){
    this.started = true;
    this.chain = this.chain.then(this._done);
    this._accept();
    return this.await;
  }
}

module.exports = DeferredChain;
