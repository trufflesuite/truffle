var factory = function(Pudding) {
  var {{NAME}} = Object.create(Pudding);
  {{NAME}}.abi = {{ABI}};
  {{NAME}}.binary = "{{BINARY}}";

  if ("{{ADDRESS}}" != "") {
    {{NAME}}.address = "{{ADDRESS}}";
  }

  return {{NAME}};
};

if (typeof module != "undefined") {
  module.exports = factory(require("ether-pudding"));
} else {
  window.{{NAME}} = factory(Pudding);
}
