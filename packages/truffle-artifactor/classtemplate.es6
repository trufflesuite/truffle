var factory = function(Pudding) {
  // Inherit from Pudding. The dependency on Babel sucks, but it's
  // the easiest way to extend a Babel-based class. Note that the
  // resulting .js file does not have a dependency on Babel.
  class {{NAME}} extends Pudding {};

  // Set up specific data for this class.
  {{NAME}}.abi = {{ABI}};
  {{NAME}}.binary = "{{BINARY}}";

  if ("{{ADDRESS}}" != "") {
    {{NAME}}.address = "{{ADDRESS}}";

    // Backward compatibility; Deprecated.
    {{NAME}}.deployed_address = "{{ADDRESS}}";
  }

  {{NAME}}.generated_with = "{{PUDDING_VERSION}}";
  {{NAME}}.contract_name = "{{NAME}}";

  return {{NAME}};
};

// Nicety for Node.
factory.load = factory;

if (typeof module != "undefined" && typeof module.exports != "undefined") {
  module.exports = factory;
} else {
  // There will only be one version of Pudding in the browser,
  // and we can use that.
  window.{{NAME}} = factory;
}
