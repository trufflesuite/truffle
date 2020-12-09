const execute = require("../execute");
const debug = require("debug")("contract:contract:bootstrap");

module.exports = fn => {
  // Add our static methods
  // Add something here about excluding send, privately defined methods
  Object.keys(fn._constructorMethods).forEach(function (key) {
    fn[key] = fn._constructorMethods[key].bind(fn);
  });

  // Add our properties.
  Object.keys(fn._properties).forEach(function (key) {
    fn.addProp(key, fn._properties[key]);
  });

  // estimateGas & request as sub-property of new
  fn["new"].estimateGas = execute.estimateDeployment.bind(fn);
  fn["new"].request = execute.requestDeployment.bind(fn);

  //add enumerations. (probably these should go in
  //constructorMethods.js, but this is easier to modify... we'll
  //redo all this in the rewrite anyway)
  if (fn._json) {
    //getters will throw otherwise!
    if (fn.ast) {
      //note this was set up earlier
      const node = locateNode(fn.contractName, fn.ast); //name also set up earlier
      if (node) {
        fn.enums = extractEnums(node);
        for (const [name, enumeration] of Object.entries(fn.enums)) {
          //enum is a reserved word :P
          if (!(name in fn)) {
            //don't overwrite anything!
            fn[name] = enumeration;
          }
        }
      }
    }
  }

  return fn;
};

function locateNode(name, ast) {
  if (ast.nodeType === "SourceUnit") {
    return ast.nodes.find(
      node => node.nodeType === "ContractDefinition" && node.name === name
    );
  } else {
    return undefined;
  }
}

function extractEnums(node) {
  return Object.assign(
    {},
    ...node.nodes
      .filter(definition => definition.nodeType === "EnumDefinition")
      .map(definition => ({
        [definition.name]: Object.assign(
          {},
          ...definition.members.map((member, index) => ({[member.name]: index}))
        )
      }))
  );
}
