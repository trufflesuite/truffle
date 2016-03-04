// From here:
// https://phabricator.babeljs.io/T3083
//
// Turns out I was doing some bad things, but for now I'm going to
// keep on doing them. TODO: Stop it.

function ExtendableBuiltin(cls){
  function ExtendableBuiltin(){
      cls.apply(this, arguments);
  }
  ExtendableBuiltin.prototype = Object.create(cls.prototype);
  Object.setPrototypeOf(ExtendableBuiltin, cls);

  return ExtendableBuiltin;
}

module.exports = ExtendableBuiltin;
